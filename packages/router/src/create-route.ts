import type { Codec, RouteConfig, RouteDefinition } from "./types.js";

/**
 * Pass-through codec, used when a route declares no codec for a shape.
 *
 * It is only reachable for the permissive defaults — `Record<string, unknown>`
 * params, `unknown` data, `unknown` screen state — because a route that names a
 * typed shape must supply the codec that decodes it (see `RouteConfig`). In
 * that default case the "decoded" type IS the stored type, so returning the
 * value unchanged is exactly right.
 */
const passthrough = function passthrough<T>(): Codec<T> {
  return {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only instantiated at the permissive defaults, where T is the stored type
    parse: (value: unknown) => value as T,
  };
};

/**
 * Declare a route. The codecs supplied here are what let `useParams(route)`,
 * `useRouteData(route)` and `useScreenState(route)` return typed values instead
 * of asserting them.
 *
 * The typed `loader` and `title` are erased into accessors that take raw stack
 * params: the params codec is closed over here, while the type parameters are
 * still in scope, so the heterogeneous route registry never has to re-assert
 * them.
 */
export const createRoute = function createRoute<
  TParams = Record<string, unknown>,
  TData = unknown,
  TState = unknown,
>(config: RouteConfig<TParams, TData, TState>): RouteDefinition<TParams, TData, TState> {
  const params: Codec<TParams> = config.params ?? passthrough<TParams>();
  const { loader, title } = config;

  return {
    component: config.component,
    data: config.data,
    errorComponent: config.errorComponent,
    id: config.id,
    load:
      loader === undefined
        ? undefined
        : async (rawParams: Record<string, unknown>): Promise<unknown> =>
            await loader({ params: params.parse(rawParams) }),
    params,
    parent: config.parent,
    pendingComponent: config.pendingComponent,
    screenState: config.screenState,
    title:
      title === undefined
        ? undefined
        : (rawParams: Record<string, unknown>): string =>
            typeof title === "string" ? title : title({ params: params.parse(rawParams) }),
  };
};
