export type {
  AnyRoute,
  Codec,
  RouteParams,
  RouteConfig,
  RouteDefinition,
  StackEntry,
  RouterState,
  RouterAction,
  RouterOptions,
  RouterInstance,
  SerializedNavigationIntent,
  ResolvedNavigation,
  NavigationResult,
  NavigationGuardResult,
  NavigationGuard,
  NavigationEvent,
  NavigationFailureContext,
} from "./types.js";

export { createRoute } from "./create-route.js";
export { createRouter } from "./create-router.js";
export { stackReducer } from "./stack.js";
export { RouterProvider } from "./context.js";
export type { RouterProviderProps } from "./context.js";
export { Outlet, getRouteChain } from "./outlet.js";
export {
  useNavigate,
  useParams,
  useRouteData,
  useCurrentRoute,
  useCanGoBack,
  useRouter,
  useScreenState,
  useActionResultHandler,
} from "./hooks.js";
export type { NavigateResult, BackResult, ActionNavigationResult } from "./action-types.js";
export { ScreenFocusProvider, useScreenFocus, useScreenEffect } from "./focus.js";
export type { ScreenFocus } from "./focus.js";
export type { ScreenStateHandle } from "./hooks.js";
export { StateCache, createStateKey } from "./state-cache.js";
export type { StateKey } from "./state-cache.js";
export { useRouterCommands } from "./command-scope.js";
