import { createContext, useContext } from "react";
import type { ReactNode } from "react";

// Context for route loader data

const RouteDataContext = createContext<unknown>(undefined);

export const RouteDataProvider = function RouteDataProvider({
  data,
  children,
}: {
  data: unknown;
  children: ReactNode;
}): ReactNode {
  return <RouteDataContext value={data}>{children}</RouteDataContext>;
};

export const useRouteDataContext = function useRouteDataContext<T = unknown>(): T | undefined {
  // Deferred(lint-sweep): typed routes/keys redesign (separate stream)
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- caller-selected T over unknown storage
  return useContext(RouteDataContext) as T | undefined;
};
