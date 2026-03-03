import { createContext, useContext, useEffect, useMemo, useRef } from "react"
import type { ReactNode } from "react"

const ScreenFocusContext = createContext({ isFocused: false })

export function ScreenFocusProvider({ active, children }: { active: boolean; children: ReactNode }) {
  const value = useMemo(() => ({ isFocused: active }), [active])
  return <ScreenFocusContext value={value}>{children}</ScreenFocusContext>
}

export function useScreenFocus() {
  return useContext(ScreenFocusContext)
}

export function useScreenEffect(effect: () => void | (() => void)) {
  const { isFocused } = useScreenFocus()
  const effectRef = useRef(effect)
  effectRef.current = effect
  useEffect(() => {
    if (!isFocused) return
    return effectRef.current()
  }, [isFocused])
}
