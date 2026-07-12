import { useCallback } from "react";
import type { RouterInstance, StackEntry } from "./types.js";
import type { ActionNavigationResult } from "./action-types.js";
import { useRouterInstance, useRouterStack, useStackEntryIndex } from "./context.js";
import { useRouteDataContext } from "./loader.js";

export const useNavigate = function useNavigate() {
  const router = useRouterInstance();
  return {
    pop: useCallback(() => {
      router.pop();
    }, [router]),
    push: useCallback(
      (routeId: string, params?: Record<string, unknown>) => {
        router.push(routeId, params);
      },
      [router],
    ),
    replace: useCallback(
      (routeId: string, params?: Record<string, unknown>) => {
        router.replace(routeId, params);
      },
      [router],
    ),
    reset: useCallback(
      (routeId: string, params?: Record<string, unknown>) => {
        router.reset(routeId, params);
      },
      [router],
    ),
  };
};

export const useParams = function useParams<T = Record<string, unknown>>(): T {
  const stack = useRouterStack();
  const entry = stack[stack.length - 1];
  // Deferred(lint-sweep): typed routes/keys redesign (separate stream)
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- caller-selected T over unknown storage
  return (entry?.params ?? {}) as T;
};

export const useRouteData = function useRouteData<T = unknown>(): T | undefined {
  return useRouteDataContext<T>();
};

export const useCurrentRoute = function useCurrentRoute(): StackEntry {
  const stack = useRouterStack();
  return stack[stack.length - 1];
};

export const useCanGoBack = function useCanGoBack(): boolean {
  const stack = useRouterStack();
  return stack.length > 1;
};

export const useRouter = function useRouter(): RouterInstance {
  return useRouterInstance();
};

export const useActionResultHandler = function useActionResultHandler() {
  const router = useRouterInstance();
  return useCallback(
    (result: ActionNavigationResult) => {
      if (result.type === "navigate") {
        if (result.mode === "replace") {
          router.replace(result.route, result.params);
        } else {
          router.push(result.route, result.params);
        }
      } else if (result.type === "back") {
        router.pop();
      }
    },
    [router],
  );
};

export const useScreenState = function useScreenState<T>(): {
  savedState: T | undefined;
  saveState: (state: T) => void;
} {
  const router = useRouterInstance();
  const stackIndex = useStackEntryIndex();
  const stack = useRouterStack();
  const entry = stack[stackIndex];
  const key = `${stackIndex}:${entry.routeId}`;

  return {
    saveState: useCallback(
      (state: T) => {
        router.stateCache.save(key, state);
      },
      [router.stateCache, key],
    ),
    savedState: router.stateCache.restore<T>(key),
  };
};
