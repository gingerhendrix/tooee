import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export type Mode = "cursor" | "insert" | "select"

interface ModeContextValue {
  mode: Mode
  setMode: (mode: Mode) => void
}

const ModeContext = createContext<ModeContextValue | null>(null)

export interface ModeProviderProps {
  children: ReactNode
  initialMode?: Mode
}

export function ModeProvider({ children, initialMode = "cursor" }: ModeProviderProps) {
  const [mode, setModeState] = useState<Mode>(initialMode)
  const setMode = useCallback((m: Mode) => setModeState(m), [])

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>
}

export function useMode(): Mode {
  const ctx = useContext(ModeContext)
  if (!ctx) {
    throw new Error("useMode must be used within a ModeProvider")
  }
  return ctx.mode
}

export function useSetMode(): (mode: Mode) => void {
  const ctx = useContext(ModeContext)
  if (!ctx) {
    throw new Error("useSetMode must be used within a ModeProvider")
  }
  return ctx.setMode
}
