/**
 * Simplified useNavigation hook.
 *
 * Key changes from previous version:
 * 1. Cursor is `number | null` instead of `Position | null` (col was always 0)
 * 2. Selection is `{ start: number; end: number } | null` instead of `{ start: Position; end: Position }`
 * 3. Single cursor state (no rawCursor + derived cursor split) — fixes j/k bug
 * 4. mode/setMode removed from return (consumers import from @tooee/commands)
 * 5. Three index-resolution helpers collapsed into one `resolve` function
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTerminalDimensions } from "@opentui/react"
import { useCommand, useMode, useSetMode, type Mode } from "@tooee/commands"

const CURSOR_MODES: Mode[] = ["cursor"]
const SELECT_MODES: Mode[] = ["select"]

export interface UseNavigationOptions {
  rowCount: number
  isSelectable?: (index: number) => boolean
  viewportHeight?: number
  multiSelect?: boolean
}

export interface NavigationState {
  cursor: number | null
  setCursor: (line: number) => void
  selection: { start: number; end: number } | null
  toggledIndices: Set<number>
}

function defaultIsSelectable(): boolean {
  return true
}

export function useNavigation({
  rowCount,
  isSelectable = defaultIsSelectable,
  viewportHeight,
  multiSelect = false,
}: UseNavigationOptions): NavigationState {
  const { height: terminalHeight } = useTerminalDimensions()
  const effectiveViewportHeight = viewportHeight ?? Math.max(1, terminalHeight - 2)
  const mode = useMode()
  const setMode = useSetMode()

  const maxIndex = Math.max(0, rowCount - 1)

  // Single resolve function replaces clampIndex + findSelectable + resolveSelectable
  const resolve = useCallback(
    (target: number, direction: 1 | -1 = 1): number | null => {
      if (rowCount <= 0) return null
      const clamped = Math.max(0, Math.min(target, maxIndex))
      if (isSelectable(clamped)) return clamped
      // Try preferred direction
      for (
        let i = clamped + direction;
        direction === 1 ? i <= maxIndex : i >= 0;
        i += direction
      ) {
        if (isSelectable(i)) return i
      }
      // Try opposite direction
      for (
        let i = clamped - direction;
        direction === 1 ? i >= 0 : i <= maxIndex;
        i -= direction
      ) {
        if (isSelectable(i)) return i
      }
      return null
    },
    [rowCount, maxIndex, isSelectable],
  )

  // Single cursor state — no rawCursor/cursor split
  const [cursor, setInternalCursor] = useState<number | null>(() => resolve(0, 1))

  // Sync cursor when rowCount transitions from 0 to > 0 (fixes async data loading)
  const prevRowCountRef = useRef(rowCount)
  useEffect(() => {
    if (prevRowCountRef.current === 0 && rowCount > 0 && cursor === null) {
      setInternalCursor(resolve(0, 1))
    }
    // Clamp cursor if rowCount shrinks
    if (cursor !== null && cursor >= rowCount && rowCount > 0) {
      setInternalCursor(resolve(rowCount - 1, -1))
    }
    if (rowCount === 0) {
      setInternalCursor(null)
    }
    prevRowCountRef.current = rowCount
  }, [rowCount, cursor, resolve])

  const cursorRef = useRef(cursor)
  cursorRef.current = cursor

  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null)
  const [rawToggledIndices, setRawToggledIndices] = useState<Set<number>>(new Set())

  // Derive valid toggled indices (filter out-of-bounds)
  const toggledIndices = useMemo(() => {
    if (rowCount <= 0) return new Set<number>()
    let needsFilter = false
    for (const i of rawToggledIndices) {
      if (i >= rowCount) { needsFilter = true; break }
    }
    if (!needsFilter) return rawToggledIndices
    return new Set(Array.from(rawToggledIndices).filter(i => i < rowCount))
  }, [rawToggledIndices, rowCount])

  const setCursor = useCallback(
    (line: number) => {
      setInternalCursor((current) => {
        const direction: 1 | -1 = current !== null && line < current ? -1 : 1
        return resolve(line, direction) ?? current
      })
    },
    [resolve],
  )

  const moveCursor = useCallback(
    (delta: number) => {
      setInternalCursor((current) => {
        if (current === null) return current
        const target = Math.max(0, Math.min(current + delta, maxIndex))
        const direction: 1 | -1 = delta < 0 ? -1 : 1
        return resolve(target, direction) ?? current
      })
    },
    [maxIndex, resolve],
  )

  const jumpCursor = useCallback(
    (target: number, direction: 1 | -1) => {
      setInternalCursor(resolve(target, direction))
    },
    [resolve],
  )

  const toggleCurrent = useCallback(() => {
    const cur = cursorRef.current
    if (cur === null) return
    setRawToggledIndices((prev) => {
      const next = new Set(prev)
      if (next.has(cur)) next.delete(cur)
      else next.add(cur)
      return next
    })
  }, [])

  // --- Command registrations ---

  useCommand({ id: "cursor-down", title: "Cursor down", hotkey: "j", modes: CURSOR_MODES, handler: () => moveCursor(1) })
  useCommand({ id: "cursor-up", title: "Cursor up", hotkey: "k", modes: CURSOR_MODES, handler: () => moveCursor(-1) })
  useCommand({ id: "cursor-half-down", title: "Cursor half page down", hotkey: "ctrl+d", modes: CURSOR_MODES, handler: () => moveCursor(Math.floor(effectiveViewportHeight / 2) || 1) })
  useCommand({ id: "cursor-half-up", title: "Cursor half page up", hotkey: "ctrl+u", modes: CURSOR_MODES, handler: () => moveCursor(-(Math.floor(effectiveViewportHeight / 2) || 1)) })
  useCommand({ id: "cursor-top", title: "Cursor to top", hotkey: "g g", modes: CURSOR_MODES, handler: () => jumpCursor(0, 1) })
  useCommand({ id: "cursor-bottom", title: "Cursor to bottom", hotkey: "shift+g", modes: CURSOR_MODES, handler: () => jumpCursor(maxIndex, -1) })

  useCommand({
    id: "enter-select",
    title: "Enter select mode",
    hotkey: "v",
    modes: CURSOR_MODES,
    handler: () => {
      setSelectionAnchor(cursorRef.current)
      setMode("select")
    },
  })

  useCommand({ id: "cursor-toggle", title: "Toggle selection", hotkey: "tab", modes: CURSOR_MODES, when: () => multiSelect, handler: toggleCurrent })
  useCommand({ id: "cursor-toggle-up", title: "Toggle and move up", hotkey: "shift+tab", modes: CURSOR_MODES, when: () => multiSelect, handler: () => { toggleCurrent(); moveCursor(-1) } })
  useCommand({ id: "select-down", title: "Extend selection down", hotkey: "j", modes: SELECT_MODES, handler: () => moveCursor(1) })
  useCommand({ id: "select-up", title: "Extend selection up", hotkey: "k", modes: SELECT_MODES, handler: () => moveCursor(-1) })
  useCommand({ id: "select-toggle", title: "Toggle selection", hotkey: "tab", modes: SELECT_MODES, when: () => multiSelect, handler: toggleCurrent })

  useCommand({
    id: "select-cancel",
    title: "Cancel selection",
    hotkey: "escape",
    modes: SELECT_MODES,
    handler: () => {
      setSelectionAnchor(null)
      setMode("cursor")
    },
  })

  const selection =
    mode === "select" && selectionAnchor !== null && cursor !== null
      ? {
          start: Math.min(selectionAnchor, cursor),
          end: Math.max(selectionAnchor, cursor),
        }
      : null

  return {
    cursor,
    setCursor,
    selection,
    toggledIndices,
  }
}
