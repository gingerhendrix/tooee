import type {
  RouterOptions,
  RouterInstance,
  RouterState,
  RouteDefinition,
  StackEntry,
} from "./types.js"
import { stackReducer } from "./stack.js"
import { StateCache } from "./state-cache.js"

export function createRouter(options: RouterOptions): RouterInstance {
  const routeMap = new Map<string, RouteDefinition>()
  for (const route of options.routes) {
    routeMap.set(route.id, route)
  }

  if (!routeMap.has(options.defaultRoute)) {
    throw new Error(`Default route "${options.defaultRoute}" not found in routes`)
  }

  let state: RouterState = {
    stack: [
      {
        routeId: options.defaultRoute,
        params: options.initialParams ?? {},
      },
    ],
  }

  const listeners = new Set<() => void>()
  const stateCache = new StateCache()

  function dispatch(action: Parameters<typeof stackReducer>[1]) {
    if (action.type !== "pop" && !routeMap.has(action.routeId)) {
      throw new Error(`Route "${action.routeId}" not found`)
    }
    const prev = state
    const next = stackReducer(state, action)
    if (next !== state) {
      if (action.type === "pop" && prev.stack.length > 1) {
        const poppedIndex = prev.stack.length - 1
        const poppedEntry = prev.stack[poppedIndex]
        stateCache.clear(`${poppedIndex}:${poppedEntry.routeId}`)
      } else if (action.type === "reset") {
        stateCache.clearAll()
      }
      state = next
      for (const listener of listeners) {
        listener()
      }
    }
  }

  const instance: RouterInstance = {
    push(routeId, params) {
      dispatch({ type: "push", routeId, params })
    },
    pop() {
      dispatch({ type: "pop" })
    },
    replace(routeId, params) {
      dispatch({ type: "replace", routeId, params })
    },
    reset(routeId, params) {
      dispatch({ type: "reset", routeId, params })
    },
    canGoBack() {
      return state.stack.length > 1
    },
    get currentRoute(): StackEntry {
      return state.stack[state.stack.length - 1]
    },
    get stack(): readonly StackEntry[] {
      return state.stack
    },
    get stateCache() {
      return stateCache
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getRouteDefinition(routeId) {
      return routeMap.get(routeId)
    },
  }

  return instance
}
