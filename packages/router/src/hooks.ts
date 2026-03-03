import { useCallback } from "react"
import type { RouterInstance, StackEntry } from "./types.js"
import type { ActionNavigationResult } from "./action-types.js"
import { useRouterInstance, useRouterStack, useStackEntryIndex } from "./context.js"
import { useRouteDataContext } from "./loader.js"

export function useNavigate() {
  const router = useRouterInstance()
  return {
    push: useCallback(
      (routeId: string, params?: Record<string, unknown>) => router.push(routeId, params),
      [router],
    ),
    pop: useCallback(() => router.pop(), [router]),
    replace: useCallback(
      (routeId: string, params?: Record<string, unknown>) => router.replace(routeId, params),
      [router],
    ),
    reset: useCallback(
      (routeId: string, params?: Record<string, unknown>) => router.reset(routeId, params),
      [router],
    ),
  }
}

export function useParams<T = Record<string, unknown>>(): T {
  const stack = useRouterStack()
  const entry = stack[stack.length - 1]
  return (entry?.params ?? {}) as T
}

export function useRouteData<T = unknown>(): T | undefined {
  return useRouteDataContext<T>()
}

export function useCurrentRoute(): StackEntry {
  const stack = useRouterStack()
  return stack[stack.length - 1]
}

export function useCanGoBack(): boolean {
  const stack = useRouterStack()
  return stack.length > 1
}

export function useRouter(): RouterInstance {
  return useRouterInstance()
}

export function useActionResultHandler() {
  const router = useRouterInstance()
  return useCallback(
    (result: ActionNavigationResult) => {
      if (result.type === "navigate") {
        if (result.mode === "replace") {
          router.replace(result.route, result.params)
        } else {
          router.push(result.route, result.params)
        }
      } else if (result.type === "back") {
        router.pop()
      }
    },
    [router],
  )
}

export function useScreenState<T>(): {
  savedState: T | undefined
  saveState: (state: T) => void
} {
  const router = useRouterInstance()
  const stackIndex = useStackEntryIndex()
  const stack = useRouterStack()
  const entry = stack[stackIndex]
  const key = `${stackIndex}:${entry.routeId}`

  return {
    savedState: router.stateCache.restore<T>(key),
    saveState: useCallback(
      (state: T) => router.stateCache.save(key, state),
      [router.stateCache, key],
    ),
  }
}
