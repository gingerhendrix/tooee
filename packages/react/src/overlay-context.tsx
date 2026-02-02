import { createContext, useContext } from "react"
import type { ReactNode } from "react"

export interface OverlayContextValue {
  show: (id: string, content: ReactNode) => void
  hide: (id: string) => void
  current: ReactNode | null
  hasOverlay: boolean
}

const defaultValue: OverlayContextValue = {
  show: () => {},
  hide: () => {},
  current: null,
  hasOverlay: false,
}

export const OverlayContext = createContext<OverlayContextValue>(defaultValue)

export function useOverlay(): { show: (id: string, content: ReactNode) => void; hide: (id: string) => void } {
  const ctx = useContext(OverlayContext)
  return { show: ctx.show, hide: ctx.hide }
}

export function useCurrentOverlay(): ReactNode | null {
  return useContext(OverlayContext).current
}

export function useHasOverlay(): boolean {
  return useContext(OverlayContext).hasOverlay
}
