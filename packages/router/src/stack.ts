import type { RouterState, RouterAction } from "./types.js"

export function stackReducer(state: RouterState, action: RouterAction): RouterState {
  switch (action.type) {
    case "push":
      return {
        stack: [
          ...state.stack,
          { routeId: action.routeId, params: action.params ?? {} },
        ],
      }
    case "pop":
      if (state.stack.length <= 1) return state
      return { stack: state.stack.slice(0, -1) }
    case "replace":
      return {
        stack: [
          ...state.stack.slice(0, -1),
          { routeId: action.routeId, params: action.params ?? {} },
        ],
      }
    case "reset":
      return {
        stack: [{ routeId: action.routeId, params: action.params ?? {} }],
      }
  }
}
