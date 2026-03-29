import { useCallback, useMemo, useRef, useState } from "react"
import { useTerminalDimensions } from "@opentui/react"
import { useCommand, useMode, useSetMode, type Mode } from "@tooee/commands"

export interface Position {
  line: number
  col: number
}

const CURSOR_MODES: Mode[] = ["cursor"]
const SELECT_MODES: Mode[] = ["select"]

export interface UseNavigationOptions {
  rowCount: number
  isSelectable?: (index: number) => boolean
  viewportHeight?: number
  multiSelect?: boolean
}

export interface NavigationState {
  mode: Mode
  setMode: (mode: Mode) => void
  cursor: Position | null
  setCursor: (line: number) => void
  selection: { start: Position; end: Position } | null
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

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(index, maxIndex)),
    [maxIndex],
  )

  const findSelectable = useCallback(
    (start: number, direction: 1 | -1) => {
      if (rowCount <= 0) return null
      const initial = Math.max(0, Math.min(start, maxIndex))
      for (
        let index = initial;
        direction === 1 ? index <= maxIndex : index >= 0;
        index += direction
      ) {
        if (isSelectable(index)) return index
      }
      return null
    },
    [rowCount, maxIndex, isSelectable],
  )

  const resolveSelectable = useCallback(
    (target: number, preferredDirection: 1 | -1 = 1) => {
      if (rowCount <= 0) return null
      const clamped = Math.max(0, Math.min(target, maxIndex))
      if (isSelectable(clamped)) return clamped
      return preferredDirection === 1
        ? findSelectable(clamped, 1) ?? findSelectable(clamped, -1)
        : findSelectable(clamped, -1) ?? findSelectable(clamped, 1)
    },
    [rowCount, maxIndex, isSelectable, findSelectable],
  )

  const [rawCursor, setRawCursor] = useState<Position | null>(() => {
    const line = resolveSelectable(0, 1)
    return line == null ? null : { line, col: 0 }
  })

  // Derive valid cursor from raw cursor + constraints
  const cursor = useMemo(() => {
    if (rowCount <= 0) return null
    if (!rawCursor) {
      if (mode !== "cursor") return null
      const line = resolveSelectable(0, 1)
      return line == null ? null : { line, col: 0 }
    }
    const preferredDirection: 1 | -1 = rawCursor.line > maxIndex ? -1 : 1
    const resolved = resolveSelectable(rawCursor.line, preferredDirection)
    if (resolved == null) return null
    if (resolved === rawCursor.line) return rawCursor
    return { line: resolved, col: 0 }
  }, [rawCursor, rowCount, maxIndex, mode, resolveSelectable])

  const cursorRef = useRef(cursor)
  cursorRef.current = cursor
  const [selectionAnchor, setSelectionAnchor] = useState<Position | null>(null)
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
      setRawCursor((current) => {
        const preferredDirection: 1 | -1 = current && line < current.line ? -1 : 1
        const nextLine = resolveSelectable(line, preferredDirection)
        if (nextLine == null) return null
        if (current && nextLine === current.line) return current
        return { line: nextLine, col: 0 }
      })
    },
    [resolveSelectable],
  )

  const moveCursor = useCallback(
    (delta: number) => {
      setRawCursor((current) => {
        if (!current) return current
        const target = clampIndex(current.line + delta)
        const preferredDirection: 1 | -1 = delta < 0 ? -1 : 1
        const nextLine = resolveSelectable(target, preferredDirection)
        if (nextLine == null) return current
        if (nextLine === current.line) return current
        return { line: nextLine, col: 0 }
      })
    },
    [clampIndex, resolveSelectable],
  )

  const jumpCursor = useCallback(
    (target: number, preferredDirection: 1 | -1) => {
      const nextLine = resolveSelectable(target, preferredDirection)
      setRawCursor(nextLine == null ? null : { line: nextLine, col: 0 })
    },
    [resolveSelectable],
  )

  const toggleCurrent = useCallback(() => {
    const cur = cursorRef.current
    if (!cur) return
    setRawToggledIndices((prev) => {
      const next = new Set(prev)
      if (next.has(cur.line)) {
        next.delete(cur.line)
      } else {
        next.add(cur.line)
      }
      return next
    })
  }, [])

  useCommand({
    id: "cursor-down",
    title: "Cursor down",
    hotkey: "j",
    modes: CURSOR_MODES,
    handler: () => moveCursor(1),
  })

  useCommand({
    id: "cursor-up",
    title: "Cursor up",
    hotkey: "k",
    modes: CURSOR_MODES,
    handler: () => moveCursor(-1),
  })

  useCommand({
    id: "cursor-half-down",
    title: "Cursor half page down",
    hotkey: "ctrl+d",
    modes: CURSOR_MODES,
    handler: () => moveCursor(Math.floor(effectiveViewportHeight / 2) || 1),
  })

  useCommand({
    id: "cursor-half-up",
    title: "Cursor half page up",
    hotkey: "ctrl+u",
    modes: CURSOR_MODES,
    handler: () => moveCursor(-(Math.floor(effectiveViewportHeight / 2) || 1)),
  })

  useCommand({
    id: "cursor-top",
    title: "Cursor to top",
    hotkey: "g g",
    modes: CURSOR_MODES,
    handler: () => jumpCursor(0, 1),
  })

  useCommand({
    id: "cursor-bottom",
    title: "Cursor to bottom",
    hotkey: "shift+g",
    modes: CURSOR_MODES,
    handler: () => jumpCursor(maxIndex, -1),
  })

  useCommand({
    id: "enter-select",
    title: "Enter select mode",
    hotkey: "v",
    modes: CURSOR_MODES,
    handler: () => {
      setSelectionAnchor(cursorRef.current ? { ...cursorRef.current } : null)
      setMode("select")
    },
  })

  useCommand({
    id: "cursor-toggle",
    title: "Toggle selection",
    hotkey: "tab",
    modes: CURSOR_MODES,
    when: () => multiSelect,
    handler: toggleCurrent,
  })

  useCommand({
    id: "cursor-toggle-up",
    title: "Toggle and move up",
    hotkey: "shift+tab",
    modes: CURSOR_MODES,
    when: () => multiSelect,
    handler: () => {
      toggleCurrent()
      moveCursor(-1)
    },
  })

  useCommand({
    id: "select-down",
    title: "Extend selection down",
    hotkey: "j",
    modes: SELECT_MODES,
    handler: () => moveCursor(1),
  })

  useCommand({
    id: "select-up",
    title: "Extend selection up",
    hotkey: "k",
    modes: SELECT_MODES,
    handler: () => moveCursor(-1),
  })

  useCommand({
    id: "select-toggle",
    title: "Toggle selection",
    hotkey: "tab",
    modes: SELECT_MODES,
    when: () => multiSelect,
    handler: toggleCurrent,
  })

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
    mode === "select" && selectionAnchor && cursor
      ? {
          start: selectionAnchor.line <= cursor.line ? selectionAnchor : cursor,
          end: selectionAnchor.line <= cursor.line ? cursor : selectionAnchor,
        }
      : null

  return {
    mode,
    setMode,
    cursor,
    setCursor,
    selection,
    toggledIndices,
  }
}
