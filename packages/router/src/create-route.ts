import type { RouteDefinition } from "./types.js"

export function createRoute<TParams = Record<string, unknown>>(
  options: RouteDefinition<TParams>,
): RouteDefinition<TParams> {
  return options
}
