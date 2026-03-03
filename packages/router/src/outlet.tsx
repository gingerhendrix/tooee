import { createContext, createElement, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { RouteDefinition, StackEntry } from "./types.js"
import { useRouterInstance, useRouterStack, StackEntryIndexContext } from "./context.js"
import { ScreenFocusProvider } from "./focus.js"
import { RouteDataProvider } from "./loader.js"

// Depth tracking context

const OutletDepthContext = createContext<number>(0)

// Helper: walk parent chain and return [root, ..., leaf]

export function getRouteChain(
  routeMap: { get(id: string): RouteDefinition | undefined },
  routeId: string,
): RouteDefinition[] {
  const chain: RouteDefinition[] = []
  let current = routeMap.get(routeId)
  while (current) {
    chain.unshift(current)
    current = current.parent
  }
  return chain
}

// RouteRenderer: handles loader lifecycle for a route

function RouteRenderer({
  entry,
  routeDef,
  children,
}: {
  entry: StackEntry
  routeDef: RouteDefinition
  children: ReactNode
}) {
  const [data, setData] = useState<unknown>(undefined)
  const [loading, setLoading] = useState(!!routeDef.loader)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!routeDef.loader) return
    let cancelled = false
    setLoading(true)
    setError(null)
    routeDef
      .loader({ params: entry.params })
      .then((result) => {
        if (!cancelled) { setData(result); setLoading(false) }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)))
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [entry, routeDef.loader])

  if (error && routeDef.errorComponent) {
    return createElement(routeDef.errorComponent, { error })
  }

  if (error) {
    return null
  }

  if (loading) {
    return routeDef.pendingComponent ? createElement(routeDef.pendingComponent) : null
  }

  return <RouteDataProvider data={data}>{children}</RouteDataProvider>
}

// Outlet component

export function Outlet() {
  const router = useRouterInstance()
  const stack = useRouterStack()
  const depth = useContext(OutletDepthContext)

  const topEntry = stack[stack.length - 1]
  if (!topEntry) return null

  const routeDef = router.getRouteDefinition(topEntry.routeId)
  if (!routeDef) return null

  const chain = getRouteChain(
    { get: (id: string) => router.getRouteDefinition(id) },
    topEntry.routeId,
  )

  const routeAtDepth = chain[depth]
  if (!routeAtDepth) return null

  const isTopOfStack = depth === chain.length - 1

  const content = (
    <StackEntryIndexContext value={stack.length - 1}>
      <OutletDepthContext value={depth + 1}>
        <ScreenFocusProvider active={isTopOfStack}>
          {createElement(routeAtDepth.component)}
        </ScreenFocusProvider>
      </OutletDepthContext>
    </StackEntryIndexContext>
  )

  if (routeAtDepth.loader) {
    return (
      <RouteRenderer entry={topEntry} routeDef={routeAtDepth}>
        {content}
      </RouteRenderer>
    )
  }

  return content
}
