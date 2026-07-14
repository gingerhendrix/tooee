import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { Codec } from "./types.js";

/**
 * Loader data, tagged with the route it came from. The identity tag is what
 * lets `useRouteData(route)` refuse to hand a component another route's data
 * just because the two shapes happen to look alike.
 */
interface RouteDataValue {
  routeId: string;
  data: unknown;
}

const RouteDataContext = createContext<RouteDataValue | undefined>(undefined);

export const RouteDataProvider = function RouteDataProvider({
  routeId,
  data,
  children,
}: {
  routeId: string;
  data: unknown;
  children: ReactNode;
}): ReactNode {
  const value = useMemo<RouteDataValue>(() => ({ data, routeId }), [data, routeId]);
  return <RouteDataContext value={value}>{children}</RouteDataContext>;
};

/** What reading loader data needs from a route: its identity and its decoder. */
export interface RouteDataSource<TData> {
  readonly id: string;
  readonly data?: Codec<TData>;
}

/**
 * Read the active route's loader data, decoded by that route's own `data` codec.
 *
 * Returns `undefined` when the requested route did not produce the data in
 * context (a parent/child in a nested chain, or a route with no loader), so a
 * component can never silently receive another route's payload.
 */
export const useRouteDataContext = function useRouteDataContext<TData>(
  route: RouteDataSource<TData>,
): TData | undefined {
  const value = useContext(RouteDataContext);
  if (value === undefined || value.routeId !== route.id) {
    return undefined;
  }
  const { data } = route;
  if (data === undefined) {
    throw new Error(
      `Route "${route.id}" has no \`data\` codec, so its loader data cannot be typed. Add \`data\` to the route to use useRouteData().`,
    );
  }
  return data.parse(value.data);
};
