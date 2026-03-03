import { createContext, useContext, useEffect, useSyncExternalStore } from "react"
import type { ReactNode } from "react"
import type { RouterInstance, StackEntry } from "./types.js"

// Contexts

const RouterInstanceContext = createContext<RouterInstance | null>(null)
const RouterStackContext = createContext<readonly StackEntry[]>([])
export const StackEntryIndexContext = createContext<number>(0)

// Provider

export interface RouterProviderProps {
  router: RouterInstance
  initialRoute?: string
  initialParams?: Record<string, unknown>
  children: ReactNode
}

export function RouterProvider({
  router,
  initialRoute,
  initialParams,
  children,
}: RouterProviderProps) {
  useEffect(() => {
    if (initialRoute && router.currentRoute.routeId !== initialRoute) {
      router.reset(initialRoute, initialParams)
    }
  }, []) // only on mount

  const stack = useSyncExternalStore(
    router.subscribe,
    () => router.stack,
  )

  return (
    <RouterInstanceContext value={router}>
      <RouterStackContext value={stack}>
        {children}
      </RouterStackContext>
    </RouterInstanceContext>
  )
}

// Internal hooks

export function useRouterInstance(): RouterInstance {
  const ctx = useContext(RouterInstanceContext)
  if (!ctx) throw new Error("useRouterInstance must be used within RouterProvider")
  return ctx
}

export function useRouterStack(): readonly StackEntry[] {
  return useContext(RouterStackContext)
}

export function useStackEntryIndex(): number {
  return useContext(StackEntryIndexContext)
}
