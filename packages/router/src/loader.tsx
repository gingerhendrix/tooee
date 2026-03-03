import { createContext, useContext } from "react"
import type { ReactNode } from "react"

// Context for route loader data

const RouteDataContext = createContext<unknown>(undefined)

export function RouteDataProvider({
  data,
  children,
}: {
  data: unknown
  children: ReactNode
}) {
  return <RouteDataContext value={data}>{children}</RouteDataContext>
}

export function useRouteDataContext<T = unknown>(): T | undefined {
  return useContext(RouteDataContext) as T | undefined
}
