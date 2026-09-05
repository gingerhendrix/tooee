import { useCallback, useMemo } from "react";
import type { AnyRoute, Codec, RouterInstance, StackEntry } from "./types.js";
import type { ActionNavigationResult } from "./action-types.js";
import { useRouterInstance, useRouterStack, useStackEntryIndex } from "./context.js";
import { useRouteDataContext } from "./loader.js";
import type { RouteDataSource } from "./loader.js";
import { createStateKey } from "./state-cache.js";

/* oxlint-disable typescript/promise-function-async -- navigation callbacks preserve synchronous programmer errors */

/** Access to the saved state for one routed screen. */
export interface ScreenStateHandle<TState> {
  savedState: TState | undefined;
  saveState: (state: TState) => void;
}

/** Stable navigation methods bound to the current router. */
export interface NavigateHandle {
  pop: RouterInstance["pop"];
  push: RouterInstance["push"];
  replace: RouterInstance["replace"];
  reset: RouterInstance["reset"];
}

/** Handle an action result by applying its navigation instruction. */
export type ActionResultHandler = (result: ActionNavigationResult) => void;

export const useNavigate = function useNavigate(): NavigateHandle {
  const router = useRouterInstance();
  return {
    pop: useCallback<RouterInstance["pop"]>((options) => router.pop(options), [router]),
    push: useCallback<RouterInstance["push"]>(
      (route, ...params) => router.push(route, ...params),
      [router],
    ),
    replace: useCallback<RouterInstance["replace"]>(
      (route, ...params) => router.replace(route, ...params),
      [router],
    ),
    reset: useCallback<RouterInstance["reset"]>(
      (route, ...params) => router.reset(route, ...params),
      [router],
    ),
  };
};

/* oxlint-enable typescript/promise-function-async */

/** Is `routeId` the active route, or an ancestor of it (nested layouts)? */
const isActiveRoute = function isActiveRoute(
  router: RouterInstance,
  activeRouteId: string,
  routeId: string,
): boolean {
  let current: AnyRoute | undefined = router.getRouteDefinition(activeRouteId);
  while (current !== undefined) {
    if (current.id === routeId) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

/**
 * The active route's params, decoded by that route's own params codec.
 *
 * The route is an INPUT, not a caller-selected return type: the codec supplied
 * with the route produces `TParams`, so the hook cannot promise a shape nobody
 * checked. Throws if the requested route is not the active one (or an ancestor
 * of it) rather than handing back another screen's params.
 */
export const useParams = function useParams<TParams>(route: {
  readonly id: string;
  readonly params: Codec<TParams>;
}): TParams {
  const router = useRouterInstance();
  const stack = useRouterStack();
  const entry = stack.at(-1);
  if (entry === undefined) {
    throw new Error("Router stack is empty");
  }
  if (!isActiveRoute(router, entry.routeId, route.id)) {
    throw new Error(`useParams("${route.id}") called while route "${entry.routeId}" is active.`);
  }
  return route.params.parse(entry.params);
};

/** The loader data for `route`, decoded by that route's `data` codec. */
export const useRouteData = function useRouteData<TData>(
  route: RouteDataSource<TData>,
): TData | undefined {
  return useRouteDataContext(route);
};

export const useCurrentRoute = function useCurrentRoute(): StackEntry {
  const stack = useRouterStack();
  const currentRoute = stack.at(-1);
  if (currentRoute === undefined) {
    throw new Error("Router stack is empty");
  }
  return currentRoute;
};

export const useCanGoBack = function useCanGoBack(): boolean {
  const stack = useRouterStack();
  return stack.length > 1;
};

export const useRouter = function useRouter(): RouterInstance {
  return useRouterInstance();
};

export const useActionResultHandler = function useActionResultHandler(): ActionResultHandler {
  const router = useRouterInstance();
  return useCallback(
    (result: ActionNavigationResult) => {
      if (result.type === "navigate") {
        void router.navigate({
          params: result.params,
          routeId: result.route,
          type: result.mode === "replace" ? "replace" : "push",
        });
      } else if (result.type === "back") {
        void router.pop();
      }
    },
    [router],
  );
};

/**
 * Per-stack-entry screen state, typed by the route's `screenState` codec.
 *
 * The storage name is still derived from the stack position and route id (state
 * stays independent per stack entry, and popping clears only that entry), but the
 * caller never manufactures a string: the typed key couples the name with the
 * codec that decodes whatever was saved under it.
 */
export const useScreenState = function useScreenState<TState>(route: {
  readonly id: string;
  readonly screenState?: Codec<TState>;
}): ScreenStateHandle<TState> {
  const router = useRouterInstance();
  const stackIndex = useStackEntryIndex();
  const stack = useRouterStack();
  const entry = stack[stackIndex];
  const { screenState } = route;
  if (screenState === undefined) {
    throw new Error(
      `Route "${route.id}" has no \`screenState\` codec, so its screen state cannot be typed. Add \`screenState\` to the route to use useScreenState().`,
    );
  }

  const key = useMemo(
    () => createStateKey(`${stackIndex}:${entry.routeId}`, screenState),
    [stackIndex, entry.routeId, screenState],
  );

  return {
    saveState: useCallback(
      (state: TState) => {
        router.stateCache.save(key, state);
      },
      [router.stateCache, key],
    ),
    savedState: router.stateCache.restore(key),
  };
};
