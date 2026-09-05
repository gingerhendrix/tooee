import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useOverlay } from "./overlay-context.js";
import type { OverlayHandle } from "./overlay-context.js";

let overlayDialogSequence = 0;

export type OverlayDialogSettle<TResult> = (result: TResult | null) => void;

export interface OverlayDialogHandle<TResult> {
  /** Open one owned modal overlay and resolve when it settles or closes. */
  open: (
    id: string,
    render: (settle: OverlayDialogSettle<TResult>) => ReactNode,
  ) => Promise<TResult | null>;
}

/**
 * Shared promise lifecycle for dialogs backed by the overlay controller.
 * Each open receives a unique overlay id and settles exactly once.
 */
export const useOverlayDialog = function useOverlayDialog<TResult>(): OverlayDialogHandle<TResult> {
  const overlay = useOverlay();
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  const openHandlesRef = useRef(new Map<string, OverlayHandle<undefined>>());
  const unmountedRef = useRef(false);

  useEffect(() => {
    unmountedRef.current = false;
    const handles = openHandlesRef.current;
    return () => {
      unmountedRef.current = true;
      for (const handle of handles.values()) {
        handle.close("unmounted");
      }
      handles.clear();
    };
  }, []);

  const dialogRef = useRef<OverlayDialogHandle<TResult> | null>(null);
  dialogRef.current ??= {
    async open(idPrefix, render): Promise<TResult | null> {
      if (unmountedRef.current) {
        return null;
      }

      overlayDialogSequence += 1;
      const id = `${idPrefix}-${overlayDialogSequence}`;
      const { promise, resolve } = Promise.withResolvers<TResult | null>();
      let settled = false;

      const finish = (result: TResult | null): boolean => {
        if (settled) {
          return false;
        }
        settled = true;
        openHandlesRef.current.delete(id);
        resolve(result);
        return true;
      };
      const settle: OverlayDialogSettle<TResult> = (result) => {
        const activeHandle = openHandlesRef.current.get(id);
        if (finish(result)) {
          activeHandle?.close("close");
        }
      };

      const handle = overlayRef.current.open(id, (): ReactNode => render(settle), undefined, {
        onClose: () => {
          finish(null);
        },
        ownCommands: true,
        role: "modal",
        surfaceMode: "insert",
      });
      openHandlesRef.current.set(id, handle);
      return await promise;
    },
  };

  return dialogRef.current;
};
