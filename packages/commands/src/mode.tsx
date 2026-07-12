import { createContext, useContext, useState, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";

export type Mode = "cursor" | "insert" | "select";

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export interface ModeProviderProps {
  children: ReactNode;
  initialMode?: Mode;
  /**
   * Internal: called synchronously whenever `setMode` changes the mode (not
   * for same-value calls). Used by the command dispatcher to treat mode
   * changes as transitions (sequence reset) instead of post-render repairs.
   */
  onModeChange?: (mode: Mode) => void;
}

export const ModeProvider = function ModeProvider({
  children,
  initialMode = "cursor",
  onModeChange,
}: ModeProviderProps) {
  const [mode, setModeState] = useState<Mode>(initialMode);
  const modeRef = useRef(mode);
  const onModeChangeRef = useRef(onModeChange);
  onModeChangeRef.current = onModeChange;

  const setMode = useCallback((m: Mode) => {
    if (m !== modeRef.current) {
      modeRef.current = m;
      onModeChangeRef.current?.(m);
    }
    setModeState(m);
  }, []);

  const value = useMemo<ModeContextValue>(() => ({ mode, setMode }), [mode, setMode]);

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
};

export const useMode = function useMode(): Mode {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useMode must be used within a ModeProvider");
  }
  return ctx.mode;
};

export const useSetMode = function useSetMode(): (mode: Mode) => void {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error("useSetMode must be used within a ModeProvider");
  }
  return ctx.setMode;
};
