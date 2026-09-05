import type { StateCache } from "./state-cache.js";
import type { ComponentType } from "react";

/**
 * Params attached to a stack entry.
 *
 * The router keeps this dictionary open on purpose. Params cross a serialized
 * boundary: the stack stores them, navigation replays them, and a screen only
 * ever reads them back through its route's own params codec. The value type is
 * therefore the input side of a decode, not a contract a caller may trust.
 *
 * Naming a JSON-like value type here would satisfy the rule below, and it would
 * also invalidate apps that keep functions, class instances, or other non-JSON
 * values in route params. The public `unknown` boundary is kept and documented
 * instead. Every `RouteParams` and `Codec` exception in this package points back
 * to this decision.
 */
// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- the open value type is the decode boundary; routes parse params through their codec
export type RouteParams = Record<string, unknown>;

/**
 * A decoder from an unparsed value to a checked `T`.
 *
 * This is the router's single decode boundary. Accepting `unknown` is what
 * makes `parse` meaningful: a codec that took a domain type would have nothing
 * left to check.
 */
export interface Codec<T> {
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- a codec input is unparsed by definition
  parse: (value: unknown) => T;
}

/** Runtime-safe shape used by the heterogeneous route registry. */
export interface AnyRoute {
  readonly id: string;
  readonly parent?: AnyRoute;
  readonly component: ComponentType;
  readonly pendingComponent?: ComponentType;
  readonly errorComponent?: ComponentType<{ error: Error }>;
  readonly params: Codec<RouteParams>;
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- the registry decodes a stored stack entry through the route's own codec
  readonly resolveParams: (value: unknown) => RouteParams;
  readonly data?: Codec<unknown>;
  readonly screenState?: Codec<unknown>;
  // oxlint-disable-next-line anti-slop/no-unknown-returns -- the registry erases each route's data type; useRouteData decodes it back
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
  component: ComponentType;
  pendingComponent?: ComponentType;
  errorComponent?: ComponentType<{ error: Error }>;
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

/* oxlint-disable anti-slop/no-unsafe-dictionary-type -- a plain `RouteParams` use is re-reported inside a type alias; the decision is recorded at the declaration */
export type SerializedNavigationIntent =
  | { type: "push"; routeId: string; params?: RouteParams }
  | { type: "replace"; routeId: string; params?: RouteParams }
  | { type: "reset"; routeId: string; params?: RouteParams }
  | { type: "pop" };
/* oxlint-enable anti-slop/no-unsafe-dictionary-type */

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

// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- a plain `RouteParams` use is re-reported inside a type alias; the decision is recorded at the declaration
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
