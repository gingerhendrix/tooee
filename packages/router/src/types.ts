import type React from "react"
import type { StateCache } from "./state-cache.js"

export interface RouteDefinition<TParams = Record<string, unknown>> {
  id: string
  parent?: RouteDefinition
  component: React.ComponentType
  title?: string | ((opts: { params: TParams }) => string)
  loader?: (opts: { params: TParams }) => Promise<unknown>
  pendingComponent?: React.ComponentType
  errorComponent?: React.ComponentType<{ error: Error }>
}

export interface StackEntry {
  routeId: string
  params: Record<string, unknown>
}

export interface RouterState {
  stack: StackEntry[]
}

export type RouterAction =
  | { type: "push"; routeId: string; params?: Record<string, unknown> }
  | { type: "pop" }
  | { type: "replace"; routeId: string; params?: Record<string, unknown> }
  | { type: "reset"; routeId: string; params?: Record<string, unknown> }

export interface RouterOptions {
  routes: RouteDefinition[]
  defaultRoute: string
  initialParams?: Record<string, unknown>
}

export interface RouterInstance {
  push(routeId: string, params?: Record<string, unknown>): void
  pop(): void
  replace(routeId: string, params?: Record<string, unknown>): void
  reset(routeId: string, params?: Record<string, unknown>): void
  canGoBack(): boolean
  readonly currentRoute: StackEntry
  readonly stack: readonly StackEntry[]
  readonly stateCache: StateCache
  subscribe(listener: () => void): () => void
  getRouteDefinition(routeId: string): RouteDefinition | undefined
}
