import type { Codec, RouteConfig, RouteDefinition, RouteParams } from "./types.js";

/**
 * The params codec used when a route declares none. It is the decode step for
 * routes that only need "some object", so it checks and rebuilds the value
 * rather than passing the caller's reference through.
 */
const passthrough = function passthrough(): Codec<RouteParams> {
  return {
    // oxlint-disable-next-line anti-slop/no-unknown-parameters -- a codec input is unparsed by definition; see the RouteParams declaration
    parse(value: unknown): RouteParams {
      // oxlint-disable-next-line anti-slop/no-runtime-typeof -- this check is the decode, not a substitute for one
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new TypeError("Route params must be an object");
      }
      return { ...value };
    },
  };
};

export function createRoute<
  TParams extends RouteParams = RouteParams,
  TData = unknown,
  TState = unknown,
>(
  config: RouteConfig<TParams, TData, TState> & { params: Codec<TParams> },
): RouteDefinition<TParams, TData, TState>;
export function createRoute<TData = unknown, TState = unknown>(
  config: RouteConfig<RouteParams, TData, TState>,
): RouteDefinition<RouteParams, TData, TState>;
export function createRoute(config: RouteConfig): RouteDefinition {
  const params = config.params ?? passthrough();
  const { canonicalize, loader, title } = config;
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- AnyRoute.resolveParams decodes a stored stack entry through this route's codec
  const resolveParams = function resolveParams(value: unknown): RouteParams {
    const decoded = params.parse(value);
    const canonical = canonicalize === undefined ? decoded : canonicalize(decoded);
    return { ...canonical };
  };

  return {
    canonicalize,
    component: config.component,
    data: config.data,
    errorComponent: config.errorComponent,
    id: config.id,
    load:
      loader === undefined
        ? undefined
        : // oxlint-disable-next-line anti-slop/no-unknown-returns -- AnyRoute erases each route's data type; useRouteData decodes it back
          async (rawParams: RouteParams): Promise<unknown> =>
            await loader({ params: params.parse(rawParams) }),
    params,
    parent: config.parent,
    pendingComponent: config.pendingComponent,
    resolveParams,
    screenState: config.screenState,
    title:
      title === undefined
        ? undefined
        : // oxlint-disable-next-line eslint/arrow-body-style -- the block places the exact local Function suppression beside its evidence
          (rawParams: RouteParams): string => {
            // The configured title is either a callback or its final string value.
            // oxlint-disable-next-line unicorn/no-instanceof-builtins -- the callback is an in-process function supplied to createRoute
            return title instanceof Function ? title({ params: params.parse(rawParams) }) : title;
          },
  };
}
