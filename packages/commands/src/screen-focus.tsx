import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

/**
 * Screen-scope focus: "is my enclosing region live?".
 *
 * This is the shared, router-agnostic half of screen focus. It composes
 * hierarchically (AND with the parent scope) so nested live regions behave
 * sensibly — a panel inside an inactive panel is itself dark. The default is
 * `true` ("no enclosing focus scope"), so a subtree with no scope provider above
 * it is considered live and `@tooee/router`'s `useScreenEffect` runs as before.
 *
 * `@tooee/panels` wraps each panel's children in a `ScreenScopeProvider` keyed on
 * the panel's active state; `@tooee/router` reads this scope and ANDs it with the
 * route-chain leaf flag so effects in an inactive panel pause. Keeping the scope
 * context here (rather than in the router) lets panels compose with route focus
 * without depending on the router package.
 */
export interface ScreenScopeState {
  isFocused: boolean;
}

const ScreenScopeContext = createContext<ScreenScopeState>({ isFocused: true });

export const ScreenScopeProvider = function ScreenScopeProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}): ReactNode {
  const parent = useContext(ScreenScopeContext);
  const value = useMemo<ScreenScopeState>(
    () => ({ isFocused: parent.isFocused && active }),
    [parent.isFocused, active],
  );
  return <ScreenScopeContext value={value}>{children}</ScreenScopeContext>;
};

/** The current screen scope (hierarchical AND of all enclosing scopes). */
export const useScreenScope = function useScreenScope(): ScreenScopeState {
  return useContext(ScreenScopeContext);
};
