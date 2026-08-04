import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { RouterInstance, StackEntry } from "./types.js";

// Contexts

const RouterInstanceContext = createContext<RouterInstance | null>(null);
const RouterStackContext = createContext<readonly StackEntry[]>([]);
export const StackEntryIndexContext = createContext<number>(0);

// Provider

export interface RouterProviderProps {
  router: RouterInstance;
  children: ReactNode;
}

export const RouterProvider = function RouterProvider({
  router,
  children,
}: RouterProviderProps): ReactNode {
  if (!router.started) {
    throw new Error(
      "RouterProvider requires a started router. Await router.start() before rendering.",
    );
  }

  const subscribe = useCallback((listener: () => void) => router.subscribe(listener), [router]);
  const stack = useSyncExternalStore(subscribe, () => router.stack);

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
