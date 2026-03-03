export type {
  RouteDefinition,
  StackEntry,
  RouterState,
  RouterAction,
  RouterOptions,
  RouterInstance,
} from "./types.js"

export { createRoute } from "./create-route.js"
export { createRouter } from "./create-router.js"
export { stackReducer } from "./stack.js"
export { RouterProvider } from "./context.js"
export type { RouterProviderProps } from "./context.js"
export { Outlet, getRouteChain } from "./outlet.js"
export {
  useNavigate,
  useParams,
  useRouteData,
  useCurrentRoute,
  useCanGoBack,
  useRouter,
  useScreenState,
  useActionResultHandler,
} from "./hooks.js"
export type {
  NavigateResult,
  BackResult,
  ActionNavigationResult,
} from "./action-types.js"
export { ScreenFocusProvider, useScreenFocus, useScreenEffect } from "./focus.js"
export { StateCache } from "./state-cache.js"
export { useRouterCommands } from "./command-scope.js"
