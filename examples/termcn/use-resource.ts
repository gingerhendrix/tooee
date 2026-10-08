/**
 * Load one async value per key. A key change or reload starts a new
 * request; results from superseded requests are dropped. A null key loads
 * nothing and reports "idle", for resources that load on demand.
 */

import { useLatest } from "@tooee/commands";
import { useCallback, useEffect, useState } from "react";

export type Resource<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; value: T }
  | { status: "error"; error: string };

export interface ResourceHandle<T> {
  resource: Resource<T>;
  reload: () => void;
}

const LOADING = { status: "loading" } as const;

const IDLE = { status: "idle" } as const;

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- caught failures enter here before conversion to display text
export const errorMessage = function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
};

export const useResource = function useResource<T>(
  key: string | null,
  load: () => Promise<T>
): ResourceHandle<T> {
  const [state, setState] = useState<{ key: string | null; resource: Resource<T> }>({
    key,
    resource: key === null ? IDLE : LOADING,
  });

  const [revision, setRevision] = useState(0);
  const loadRef = useLatest(load);

  useEffect(() => {
    let active = true;

    if (key === null) {
      setState({ key, resource: IDLE });

      return () => {
        active = false;
      };
    }

    setState({ key, resource: LOADING });

    void (async () => {
      try {
        const value = await loadRef.current();

        if (active) {
          setState({ key, resource: { status: "ready", value } });
        }
      } catch (error) {
        if (active) {
          setState({ key, resource: { error: errorMessage(error), status: "error" } });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [key, revision, loadRef]);

  const reload = useCallback(() => {
    setRevision((value) => value + 1);
  }, []);

  // Until the effect for a new key runs, report loading rather than the old key's value.
  if (state.key === key) {
    return { reload, resource: state.resource };
  }

  return { reload, resource: key === null ? IDLE : LOADING };
};
