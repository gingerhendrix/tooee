import type { AnyRoute, RouterOptions, RouterInstance, RouterState, StackEntry } from "./types.js";
import { stackReducer } from "./stack.js";
import { StateCache } from "./state-cache.js";

export const createRouter = function createRouter(options: RouterOptions): RouterInstance {
  const routeMap = new Map<string, AnyRoute>();
  for (const route of options.routes) {
    routeMap.set(route.id, route);
  }

  if (!routeMap.has(options.defaultRoute)) {
    throw new Error(`Default route "${options.defaultRoute}" not found in routes`);
  }

  let state: RouterState = {
    stack: [
      {
        params: options.initialParams ?? {},
        routeId: options.defaultRoute,
      },
    ],
  };

  const listeners = new Set<() => void>();
  const stateCache = new StateCache();

  const dispatch = function dispatch(action: Parameters<typeof stackReducer>[1]) {
    if (action.type !== "pop" && !routeMap.has(action.routeId)) {
      throw new Error(`Route "${action.routeId}" not found`);
    }
    const prev = state;
    const next = stackReducer(state, action);
    if (next !== state) {
      if (action.type === "pop" && prev.stack.length > 1) {
        const poppedIndex = prev.stack.length - 1;
        const poppedEntry = prev.stack[poppedIndex];
        // Screen-state keys are named by stack position + route id (see useScreenState).
        stateCache.clear(`${poppedIndex}:${poppedEntry.routeId}`);
      } else if (action.type === "reset") {
        stateCache.clearAll();
      }
      state = next;
      for (const listener of listeners) {
        listener();
      }
    }
  };

  const instance: RouterInstance = {
    canGoBack() {
      return state.stack.length > 1;
    },
    get currentRoute(): StackEntry {
      const currentRoute = state.stack.at(-1);
      if (currentRoute === undefined) {
        throw new Error("Router stack is empty");
      }
      return currentRoute;
    },
    getRouteDefinition(routeId) {
      return routeMap.get(routeId);
    },
    pop() {
      dispatch({ type: "pop" });
    },
    push(routeId, params) {
      dispatch({ params, routeId, type: "push" });
    },
    replace(routeId, params) {
      dispatch({ params, routeId, type: "replace" });
    },
    reset(routeId, params) {
      dispatch({ params, routeId, type: "reset" });
    },
    get stack(): readonly StackEntry[] {
      return state.stack;
    },
    get stateCache() {
      return stateCache;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  return instance;
};
