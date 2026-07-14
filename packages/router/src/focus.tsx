import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import type { EffectCallback, ReactNode } from "react";

const ScreenFocusContext = createContext({ isFocused: false });

export const ScreenFocusProvider = function ScreenFocusProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}): ReactNode {
  const value = useMemo(() => ({ isFocused: active }), [active]);
  return <ScreenFocusContext value={value}>{children}</ScreenFocusContext>;
};

export const useScreenFocus = function useScreenFocus() {
  return useContext(ScreenFocusContext);
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
