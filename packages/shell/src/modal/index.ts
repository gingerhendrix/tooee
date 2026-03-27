import { useState, useCallback, useRef, useEffect } from "react"
import { useMode, useSetMode, type Mode } from "@tooee/commands"
import { useTerminalDimensions } from "@opentui/react"
import { useCursorCommands } from "./cursor-commands.js"
import { useSelectCommands, type SelectState } from "./select-commands.js"
import { useSearchCommands, type SearchState } from "./search-commands.js"

export interface Position {
  line: number
  col: number
}

export interface ModalNavigationState {
  mode: Mode
  setMode: (mode: Mode) => void
  cursor: Position | null
  selection: { start: Position; end: Position } | null
  toggledIndices: Set<number>
  searchQuery: string
  searchActive: boolean
  setSearchQuery: (query: string) => void
  matchingLines: number[]
  currentMatchIndex: number
  submitSearch: () => void
}

export interface ModalNavigationOptions {
  totalLines: number
  viewportHeight?: number
  getText?: () => string | undefined
  blockCount?: number
  blockLineMap?: number[]
  /** Offset to subtract from search line numbers to get block indices (for when getText has different line structure than visual) */
  searchLineOffset?: number
  multiSelect?: boolean
}

/**
 * Shared mutable state passed to sub-command hooks.
 *
 * This interface lets cursor, select, and search command hooks read and
 * modify core navigation state without taking dozens of individual parameters.
 */
export interface ModalCoreState {
  setCursor: React.Dispatch<React.SetStateAction<Position | null>>
  cursorRef: React.MutableRefObject<Position | null>
  clampCursor: (value: number) => number
  cursorMax: number
  isBlockMode: boolean
  viewportHeight: number
  multiSelect: boolean
  mode: Mode
  setMode: (mode: Mode) => void
  setToggledIndices: React.Dispatch<React.SetStateAction<Set<number>>>
}

export function useModalNavigationCommands(opts: ModalNavigationOptions): ModalNavigationState {
  const { height: terminalHeight } = useTerminalDimensions()
  const {
    totalLines,
    viewportHeight = terminalHeight - 2,
    getText,
    blockCount,
    blockLineMap,
    searchLineOffset = 0,
    multiSelect = false,
  } = opts
  const mode = useMode()
  const setMode = useSetMode()

  const [cursor, setCursor] = useState<Position | null>(null)
  const [selectionAnchor, setSelectionAnchor] = useState<Position | null>(null)
  const [toggledIndices, setToggledIndices] = useState<Set<number>>(new Set())

  const cursorRef = useRef(cursor)
  cursorRef.current = cursor

  const isBlockMode = blockCount != null
  const cursorMax = isBlockMode ? Math.max(0, blockCount - 1) : Math.max(0, totalLines - 1)

  const clampCursor = useCallback(
    (value: number) => Math.max(0, Math.min(value, cursorMax)),
    [cursorMax],
  )

  // Clean up toggled indices when cursorMax shrinks (render-time state adjustment)
  const [prevCursorMax, setPrevCursorMax] = useState(cursorMax)
  if (cursorMax !== prevCursorMax) {
    setPrevCursorMax(cursorMax)
    setToggledIndices((prev) => {
      const filtered = Array.from(prev).filter((index) => index <= cursorMax)
      return filtered.length === prev.size ? prev : new Set(filtered)
    })
  }

  // Build shared state object for sub-hooks
  const coreState: ModalCoreState = {
    setCursor,
    cursorRef,
    clampCursor,
    cursorMax,
    isBlockMode,
    viewportHeight,
    multiSelect,
    mode,
    setMode,
    setToggledIndices,
  }

  // Register sub-command hooks
  useCursorCommands(coreState)
  useSelectCommands(coreState, selectionAnchor, { getText, blockLineMap })
  const search = useSearchCommands(coreState, { getText })

  // When entering cursor mode, initialize cursor if not already set
  const prevMode = useRef<Mode | null>(null)
  useEffect(() => {
    if (mode === "cursor" && prevMode.current !== "cursor" && prevMode.current !== "select") {
      setCursor((existing) => {
        // If cursor already exists (e.g. set by a command via palette), preserve it
        if (existing) return existing
        // If there's an active search match, start cursor there; otherwise start at scroll position
        const matches = search.matchingLinesRef.current
        if (matches.length > 0) {
          const matchLine = matches[search.currentMatchIndex] ?? matches[0]
          // In block mode, convert search line to block index using offset
          if (isBlockMode) {
            const blockIndex = Math.max(0, matchLine - searchLineOffset)
            return { line: Math.min(blockIndex, cursorMax), col: 0 }
          }
          return { line: matchLine, col: 0 }
        }
        // No search match - start at top
        return { line: 0, col: 0 }
      })
    }
    if (mode === "select" && prevMode.current === "cursor" && cursor) {
      setSelectionAnchor({ ...cursor })
    }
    prevMode.current = mode
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Compute selection from anchor + cursor
  const selection =
    selectionAnchor && cursor && mode === "select"
      ? {
          start: selectionAnchor.line <= cursor.line ? selectionAnchor : cursor,
          end: selectionAnchor.line <= cursor.line ? cursor : selectionAnchor,
        }
      : null

  return {
    mode,
    setMode,
    cursor,
    selection,
    toggledIndices,
    searchQuery: search.searchQuery,
    searchActive: search.searchActive,
    setSearchQuery: search.setSearchQuery,
    matchingLines: search.matchingLines,
    currentMatchIndex: search.currentMatchIndex,
    submitSearch: search.submitSearch,
  }
}
