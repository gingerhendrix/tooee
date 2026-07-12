import type { RouteDefinition } from "./types.js";

export const createRoute = function createRoute<TParams = Record<string, unknown>>(
  options: RouteDefinition<TParams>,
): RouteDefinition<TParams> {
  return options;
};
