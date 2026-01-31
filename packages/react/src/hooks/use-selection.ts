import { useCallback, useState } from "react"
import { useKeyboard } from "@opentui/react"
import type { KeyEvent } from "@opentui/core"

export interface SelectionOptions<T> {
  items: T[]
  multiSelect?: boolean
  onSelect?: (item: T, index: number) => void
  onActivate?: (item: T, index: number) => void
  onYank?: (items: T[]) => void
}

export interface SelectionState {
  activeIndex: number
  selectedIndices: Set<number>
  visualMode: boolean
}

export function useSelection<T>(options: SelectionOptions<T>): SelectionState {
  const { items, multiSelect = false, onSelect, onActivate, onYank } = options
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [visualMode, setVisualMode] = useState(false)

  const clampIndex = useCallback(
    (idx: number) => Math.max(0, Math.min(idx, items.length - 1)),
    [items.length],
  )

  useKeyboard((event: KeyEvent) => {
    if (event.defaultPrevented) return
    if (items.length === 0) return

    if (event.name === "j" && !event.ctrl) {
      event.preventDefault()
      setActiveIndex((i) => {
        const next = clampIndex(i + 1)
        if (visualMode) {
          setSelectedIndices((s) => new Set([...s, next]))
        }
        return next
      })
    } else if (event.name === "k" && !event.ctrl) {
      event.preventDefault()
      setActiveIndex((i) => {
        const next = clampIndex(i - 1)
        if (visualMode) {
          setSelectedIndices((s) => new Set([...s, next]))
        }
        return next
      })
    } else if (event.name === "return") {
      event.preventDefault()
      const item = items[activeIndex]
      if (item !== undefined) {
        onActivate?.(item, activeIndex)
      }
    } else if (event.name === " " && multiSelect) {
      event.preventDefault()
      setSelectedIndices((s) => {
        const next = new Set(s)
        if (next.has(activeIndex)) {
          next.delete(activeIndex)
        } else {
          next.add(activeIndex)
        }
        return next
      })
      const item = items[activeIndex]
      if (item !== undefined) {
        onSelect?.(item, activeIndex)
      }
    } else if (event.name === "v" && !event.ctrl) {
      event.preventDefault()
      setVisualMode((v) => !v)
      if (!visualMode) {
        setSelectedIndices(new Set([activeIndex]))
      }
    } else if (event.name === "y" && !event.ctrl) {
      event.preventDefault()
      const selected = [...selectedIndices].sort().map((i) => items[i]!).filter(Boolean)
      if (selected.length > 0) {
        onYank?.(selected)
      } else {
        const item = items[activeIndex]
        if (item !== undefined) {
          onYank?.([item])
        }
      }
    }
  })

  return { activeIndex, selectedIndices, visualMode }
}
