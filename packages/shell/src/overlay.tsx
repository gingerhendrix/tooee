import { useState, useCallback, useMemo } from "react"
import type { ReactNode } from "react"
import { OverlayContext } from "@tooee/react"

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [overlays, setOverlays] = useState<Map<string, ReactNode>>(new Map())

  const show = useCallback((id: string, content: ReactNode) => {
    setOverlays((prev) => {
      const next = new Map(prev)
      next.delete(id) // Remove first to re-insert at end (maintains stack order)
      next.set(id, content)
      return next
    })
  }, [])

  const hide = useCallback((id: string) => {
    setOverlays((prev) => {
      if (!prev.has(id)) return prev
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const value = useMemo(() => {
    let current: ReactNode | null = null
    for (const [, content] of overlays) {
      current = content
    }
    return {
      show,
      hide,
      current,
      hasOverlay: overlays.size > 0,
    }
  }, [overlays, show, hide])

  return <OverlayContext value={value}>{children}</OverlayContext>
}
