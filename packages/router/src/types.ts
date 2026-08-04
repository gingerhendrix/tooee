import type React from "react";
import type { StateCache } from "./state-cache.js";

export type RouteParams = Record<string, unknown>;

export interface Codec<T> {
  parse: (value: unknown) => T;
}

/** Runtime-safe shape used by the heterogeneous route registry. */
export interface AnyRoute {
  readonly id: string;
  readonly parent?: AnyRoute;
  readonly component: React.ComponentType;
  readonly pendingComponent?: React.ComponentType;
  readonly errorComponent?: React.ComponentType<{ error: Error }>;
  readonly params: Codec<RouteParams>;
  readonly resolveParams: (value: unknown) => RouteParams;
  readonly data?: Codec<unknown>;
  readonly screenState?: Codec<unknown>;
  readonly load?: (params: RouteParams) => Promise<unknown>;
  readonly title?: (params: RouteParams) => string;
}

export interface RouteDefinition<
  TParams extends RouteParams = RouteParams,
  TData = unknown,
  TState = unknown,
> extends Omit<AnyRoute, "data" | "params" | "screenState"> {
  readonly params: Codec<TParams>;
  readonly canonicalize?: (params: TParams) => TParams;
  readonly data?: Codec<TData>;
  readonly screenState?: Codec<TState>;
}

export interface RouteConfig<
  TParams extends RouteParams = RouteParams,
  TData = unknown,
  TState = unknown,
> {
  id: string;
  parent?: AnyRoute;
  component: React.ComponentType;
  pendingComponent?: React.ComponentType;
  errorComponent?: React.ComponentType<{ error: Error }>;
  title?: string | ((opts: { params: TParams }) => string);
  loader?: (opts: { params: TParams }) => Promise<TData>;
  params?: Codec<TParams>;
  canonicalize?: (params: TParams) => TParams;
  data?: Codec<TData>;
  screenState?: Codec<TState>;
}

export interface StackEntry {
  routeId: string;
  params: RouteParams;
}

export interface RouterState {
  stack: StackEntry[];
}

export type SerializedNavigationIntent =
  | { type: "push"; routeId: string; params?: RouteParams }
  | { type: "replace"; routeId: string; params?: RouteParams }
  | { type: "reset"; routeId: string; params?: RouteParams }
  | { type: "pop" };

export type RouterAction = SerializedNavigationIntent;

export interface ResolvedNavigation {
  readonly id: number;
  readonly intent: SerializedNavigationIntent;
  readonly from: readonly Readonly<StackEntry>[];
  readonly target: Readonly<StackEntry> | null;
  readonly next: readonly Readonly<StackEntry>[];
  readonly signal: AbortSignal;
}

export type NavigationResult =
  | {
      status: "committed";
      id: number;
      from: readonly Readonly<StackEntry>[];
      to: readonly Readonly<StackEntry>[];
    }
  | { status: "cancelled"; id: number; reason: "guard" | "superseded" | "aborted" }
  | { status: "noop"; id: number; reason: "stack-bottom" }
  | { status: "failed"; id: number; error: Error };

export type NavigationGuardResult =
  // oxlint-disable-next-line typescript/no-invalid-void-type -- guard callbacks conventionally use implicit void to allow navigation
  | void
  | false
  | {
      target?: StackEntry;
      beforeCommit?: () => void;
      abort?: () => void;
    };

export type NavigationGuard<TContext> = (
  navigation: ResolvedNavigation,
  context: TContext,
) => NavigationGuardResult | Promise<NavigationGuardResult>;

export type NavigationEvent =
  | { type: "started"; navigation: ResolvedNavigation }
  | { type: "settled"; navigation: ResolvedNavigation; result: NavigationResult };

export interface NavigationFailureContext {
  readonly id: number;
  readonly intent: SerializedNavigationIntent;
  readonly navigation?: ResolvedNavigation;
}

export interface RouterOptions<TContext = undefined> {
  routes: readonly AnyRoute[];
  initial: { routeId: string; params?: RouteParams };
  context?: TContext;
  beforeNavigate?: NavigationGuard<TContext> | readonly NavigationGuard<TContext>[];
  onNavigationError?: (error: Error, context: NavigationFailureContext) => void;
  onSubscriberError?: (error: Error) => void;
}

type OptionalParams<TParams extends RouteParams> =
  Record<string, never> extends TParams ? [params?: TParams] : [params: TParams];

export interface RouterInstance<TContext = undefined> {
  start: (options?: { signal?: AbortSignal }) => Promise<NavigationResult>;
  readonly started: boolean;
  navigate: (
    intent: SerializedNavigationIntent,
    options?: { signal?: AbortSignal },
  ) => Promise<NavigationResult>;
  push: <TParams extends RouteParams>(
    route: RouteDefinition<TParams>,
    ...params: OptionalParams<TParams>
  ) => Promise<NavigationResult>;
  replace: <TParams extends RouteParams>(
    route: RouteDefinition<TParams>,
    ...params: OptionalParams<TParams>
  ) => Promise<NavigationResult>;
  reset: <TParams extends RouteParams>(
    route: RouteDefinition<TParams>,
    ...params: OptionalParams<TParams>
  ) => Promise<NavigationResult>;
  pop: (options?: { signal?: AbortSignal }) => Promise<NavigationResult>;
  addNavigationGuard: (guard: NavigationGuard<TContext>) => () => void;
  readonly pendingNavigation: ResolvedNavigation | null;
  subscribeNavigation: (listener: (event: NavigationEvent) => void) => () => void;
  readonly context: TContext;
  canGoBack: () => boolean;
  readonly currentRoute: Readonly<StackEntry>;
  readonly stack: readonly Readonly<StackEntry>[];
  readonly stateCache: StateCache;
  subscribe: (listener: () => void) => () => void;
  getRouteDefinition: (routeId: string) => AnyRoute | undefined;
}
