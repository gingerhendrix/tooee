import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import type { EffectCallback, ReactNode } from "react";
import { useScreenScope } from "@tooee/commands";

/**
 * Route-chain leaf flag. Set by `Outlet` at each depth to `isTopOfStack`, with
 * OVERRIDE semantics: a nested `Outlet` replaces its parent layout's value, so a
 * focused leaf rendered inside an unfocused parent layout stays focused. Default
 * `true` ("not inside a route chain") so screen focus outside any router reduces
 * to the enclosing scope.
 */
interface RouteFocusState {
  active: boolean;
}

const RouteFocusContext = createContext<RouteFocusState>({ active: true });

export const ScreenFocusProvider = function ScreenFocusProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}): ReactNode {
  const value = useMemo<RouteFocusState>(() => ({ active }), [active]);
  return <RouteFocusContext value={value}>{children}</RouteFocusContext>;
};

/**
 * "Am I the live screen?" — the enclosing screen scope (panels etc.) ANDed with
 * this depth's route-chain leaf flag. Both default to focused, so a plain router
 * app is unchanged (scope `true` AND leaf), and a leaf inside an inactive panel
 * reports unfocused (scope `false`) without the router knowing about panels.
 */
export const useScreenFocus = function useScreenFocus(): { isFocused: boolean } {
  const scope = useScreenScope();
  const route = useContext(RouteFocusContext);
  return { isFocused: scope.isFocused && route.active };
};

/**
 * `useEffect`, scoped to the focused screen. The callback uses React's own
 * `EffectCallback` type (`() => void | Destructor`), so the no-cleanup branch is
 * modelled the way React models it, without a hand-rolled `void` union.
 */
export const useScreenEffect = function useScreenEffect(effect: EffectCallback): void {
  const { isFocused } = useScreenFocus();
  const effectRef = useRef(effect);
  effectRef.current = effect;
  useEffect(() => (isFocused ? effectRef.current() : undefined), [isFocused]);
};
