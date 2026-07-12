import type { RouterState, RouterAction } from "./types.js";

export function stackReducer(state: RouterState, action: RouterAction): RouterState {
  switch (action.type) {
    case "push": {
      return {
        stack: [...state.stack, { params: action.params ?? {}, routeId: action.routeId }],
      };
    }
    case "pop": {
      if (state.stack.length <= 1) {
        return state;
      }
      return { stack: state.stack.slice(0, -1) };
    }
    case "replace": {
      return {
        stack: [
          ...state.stack.slice(0, -1),
          { params: action.params ?? {}, routeId: action.routeId },
        ],
      };
    }
    case "reset": {
      return {
        stack: [{ params: action.params ?? {}, routeId: action.routeId }],
      };
    }
  }
}
