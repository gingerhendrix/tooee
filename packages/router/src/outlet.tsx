import { createContext, createElement, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AnyRoute, StackEntry } from "./types.js";
import { useRouterInstance, useRouterStack, StackEntryIndexContext } from "./context.js";
import { ScreenFocusProvider } from "./focus.js";
import { RouteDataProvider } from "./loader.js";

// Depth tracking context

const OutletDepthContext = createContext<number>(0);

// Helper: walk parent chain and return [root, ..., leaf]

export const getRouteChain = function getRouteChain(
  routeMap: { get: (id: string) => AnyRoute | undefined },
  routeId: string,
): AnyRoute[] {
  const chain: AnyRoute[] = [];
  let current = routeMap.get(routeId);
  while (current) {
    chain.unshift(current);
    current = current.parent;
  }
  return chain;
};

// RouteRenderer: handles loader lifecycle for a route

const RouteRenderer = function RouteRenderer({
  entry,
  routeDef,
  children,
}: {
  entry: StackEntry;
  routeDef: AnyRoute;
  children: ReactNode;
}): ReactNode {
  const [data, setData] = useState<unknown>();
  const [loading, setLoading] = useState(routeDef.load !== undefined);
  const [loaderError, setLoaderError] = useState<Error | null>(null);

  useEffect(() => {
    const { load } = routeDef;
    let cancelled = false;
    if (load !== undefined) {
      setLoading(true);
      setLoaderError(null);
      void (async () => {
        try {
          const result = await load(entry.params);
          if (!cancelled) {
            setData(result);
            setLoading(false);
          }
        } catch (error) {
          if (!cancelled) {
            setLoaderError(error instanceof Error ? error : new Error(String(error)));
            setLoading(false);
          }
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, [entry, routeDef]);

  if (loaderError && routeDef.errorComponent) {
    return createElement(routeDef.errorComponent, { error: loaderError });
  }

  if (loaderError) {
    return null;
  }

  if (loading) {
    return routeDef.pendingComponent ? createElement(routeDef.pendingComponent) : null;
  }

  return (
    <RouteDataProvider routeId={routeDef.id} data={data}>
      {children}
    </RouteDataProvider>
  );
};

// Outlet component

export const Outlet = function Outlet(): ReactNode {
  const router = useRouterInstance();
  const stack = useRouterStack();
  const depth = useContext(OutletDepthContext);

  const topEntry = stack.at(-1);
  if (topEntry === undefined) {
    return null;
  }

  const routeDef = router.getRouteDefinition(topEntry.routeId);
  if (!routeDef) {
    return null;
  }

  const chain = getRouteChain(
    { get: (id: string) => router.getRouteDefinition(id) },
    topEntry.routeId,
  );

  const routeAtDepth = chain[depth];
  if (routeAtDepth === undefined) {
    return null;
  }

  const isTopOfStack = depth === chain.length - 1;

  const content = (
    <StackEntryIndexContext value={stack.length - 1}>
      <OutletDepthContext value={depth + 1}>
        <ScreenFocusProvider active={isTopOfStack}>
          {createElement(routeAtDepth.component)}
        </ScreenFocusProvider>
      </OutletDepthContext>
    </StackEntryIndexContext>
  );

  if (routeAtDepth.load !== undefined) {
    return (
      <RouteRenderer entry={topEntry} routeDef={routeAtDepth}>
        {content}
      </RouteRenderer>
    );
  }

  return content;
};
