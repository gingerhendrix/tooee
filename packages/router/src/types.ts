import type React from "react";
import type { StateCache } from "./state-cache.js";

/**
 * A decoder for a value that crosses an untyped boundary: params handed to
 * `push()`, loader output stored as `unknown`, or cached screen state. A codec
 * is what makes a route hook's return type truthful — without one, the caller
 * would just be asserting a type the router cannot check.
 */
export interface Codec<T> {
  parse: (value: unknown) => T;
}

/**
 * A route as produced by `createRoute`. The type parameters come from the
 * route's codecs, so every hook that returns one of these shapes can decode it
 * from the untyped value the router actually stores.
 */
export interface RouteDefinition<
  TParams = Record<string, unknown>,
  TData = unknown,
  TState = unknown,
> {
  readonly id: string;
  readonly parent?: AnyRoute;
  readonly component: React.ComponentType;
  readonly pendingComponent?: React.ComponentType;
  readonly errorComponent?: React.ComponentType<{ error: Error }>;
  /** Decodes a stack entry's params; `useParams(route)` returns `TParams`. */
  readonly params: Codec<TParams>;
  /** Decodes this route's loader output. Required by `useRouteData(route)`. */
  readonly data?: Codec<TData>;
  /** Decodes this route's cached screen state. Required by `useScreenState(route)`. */
  readonly screenState?: Codec<TState>;
  /**
   * Erased runtime entry point for the loader. `createRoute` closes over the
   * typed loader and the params codec, so the heterogeneous route registry can
   * invoke it with raw stack params without re-asserting `TParams`.
   */
  readonly load?: (params: Record<string, unknown>) => Promise<unknown>;
  /** Erased title accessor (see `load`). */
  readonly title?: (params: Record<string, unknown>) => string;
}

/** A route of any shape, as held by the router's heterogeneous registry. */
export type AnyRoute = RouteDefinition<unknown>;

/** The input accepted by `createRoute`. */
export interface RouteConfig<TParams = Record<string, unknown>, TData = unknown, TState = unknown> {
  id: string;
  parent?: AnyRoute;
  component: React.ComponentType;
  pendingComponent?: React.ComponentType;
  errorComponent?: React.ComponentType<{ error: Error }>;
  title?: string | ((opts: { params: TParams }) => string);
  loader?: (opts: { params: TParams }) => Promise<TData>;
  /**
   * Declare a codec whenever the route declares a typed shape. Omitting one is
   * only meaningful for the permissive defaults (`Record<string, unknown>`
   * params, `unknown` data/state), where the stored value is passed through.
   */
  params?: Codec<TParams>;
  data?: Codec<TData>;
  screenState?: Codec<TState>;
}

export interface StackEntry {
  routeId: string;
  params: Record<string, unknown>;
}

export interface RouterState {
  stack: StackEntry[];
}

export type RouterAction =
  | { type: "push"; routeId: string; params?: Record<string, unknown> }
  | { type: "pop" }
  | { type: "replace"; routeId: string; params?: Record<string, unknown> }
  | { type: "reset"; routeId: string; params?: Record<string, unknown> };

export interface RouterOptions {
  routes: AnyRoute[];
  defaultRoute: string;
  initialParams?: Record<string, unknown>;
}

export interface RouterInstance {
  push: (routeId: string, params?: Record<string, unknown>) => void;
  pop: () => void;
  replace: (routeId: string, params?: Record<string, unknown>) => void;
  reset: (routeId: string, params?: Record<string, unknown>) => void;
  canGoBack: () => boolean;
  readonly currentRoute: StackEntry;
  readonly stack: readonly StackEntry[];
  readonly stateCache: StateCache;
  subscribe: (listener: () => void) => () => void;
  getRouteDefinition: (routeId: string) => AnyRoute | undefined;
}
