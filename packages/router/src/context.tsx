import { createContext, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { RouterInstance, StackEntry } from "./types.js";

// Contexts

const RouterInstanceContext = createContext<RouterInstance | null>(null);
const RouterStackContext = createContext<readonly StackEntry[]>([]);
export const StackEntryIndexContext = createContext<number>(0);

// Provider

export interface RouterProviderProps {
  router: RouterInstance;
  initialRoute?: string;
  initialParams?: Record<string, unknown>;
  children: ReactNode;
}

export const RouterProvider = function RouterProvider({
  router,
  initialRoute,
  initialParams,
  children,
}: RouterProviderProps): ReactNode {
  const initialRouteRef = useRef(initialRoute);
  const initialParamsRef = useRef(initialParams);
  const routerRef = useRef(router);

  // Only run the initial-route reconciliation on mount.
  useEffect(() => {
    const mountInitialRoute = initialRouteRef.current;
    const mountRouter = routerRef.current;
    if (mountInitialRoute && mountRouter.currentRoute.routeId !== mountInitialRoute) {
      mountRouter.reset(mountInitialRoute, initialParamsRef.current);
    }
  }, []);

  const stack = useSyncExternalStore(router.subscribe, () => router.stack);

  return (
    <RouterInstanceContext value={router}>
      <RouterStackContext value={stack}>{children}</RouterStackContext>
    </RouterInstanceContext>
  );
};

// Internal hooks

export const useRouterInstance = function useRouterInstance(): RouterInstance {
  const ctx = useContext(RouterInstanceContext);
  if (!ctx) {
    throw new Error("useRouterInstance must be used within RouterProvider");
  }
  return ctx;
};

export const useRouterStack = function useRouterStack(): readonly StackEntry[] {
  return useContext(RouterStackContext);
};

export const useStackEntryIndex = function useStackEntryIndex(): number {
  return useContext(StackEntryIndexContext);
};
