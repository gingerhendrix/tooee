import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { useCommand, useMode, useSetMode, type Mode } from "@tooee/commands"
import { copyToClipboard } from "@tooee/react"
import { useTerminalDimensions } from "@opentui/react"
import { findMatchingLines } from "./search.ts"

export interface Position {
  line: number
  col: number
}

export interface ModalNavigationState {
  mode: Mode
  setMode: (mode: Mode) => void
  scrollOffset: number
  cursor: Position | null
  selection: { start: Position; end: Position } | null
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
}

export function useModalNavigationCommands(opts: ModalNavigationOptions): ModalNavigationState {
  const { height: terminalHeight } = useTerminalDimensions()
  const { totalLines, viewportHeight = terminalHeight - 2, getText, blockCount, blockLineMap } = opts
  const mode = useMode()
  const setMode = useSetMode()

  const [scrollOffset, setScrollOffset] = useState(0)
  const [cursor, setCursor] = useState<Position | null>(null)
  const [selectionAnchor, setSelectionAnchor] = useState<Position | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchActive, setSearchActive] = useState(false)
  const [matchingLines, setMatchingLines] = useState<number[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const preSearchModeRef = useRef<Mode>("command")

  // Incremental search: recompute matches when query changes while search is active
  const searchQueryRef = useRef(searchQuery)
  searchQueryRef.current = searchQuery
  const matchingLinesRef = useRef(matchingLines)
  matchingLinesRef.current = matchingLines

  useEffect(() => {
    if (!searchActive) return
    const text = getText?.()
    if (!text || !searchQuery) {
      setMatchingLines([])
      setCurrentMatchIndex(0)
      return
    }
    const matches = findMatchingLines(text, searchQuery)
    setMatchingLines(matches)
    setCurrentMatchIndex(0)
    if (matches.length > 0) {
      // Auto-jump to first match
      const line = matches[0]
      setScrollOffset((offset) => {
        if (line < offset || line >= offset + viewportHeight) {
          return Math.max(0, Math.min(line, Math.max(0, totalLines - viewportHeight)))
        }
        return offset
      })
      if (mode === "cursor" || mode === "select") {
        setCursor((c) => c ? { line, col: 0 } : c)
      }
    }
  }, [searchQuery, searchActive]) // eslint-disable-line react-hooks/exhaustive-deps

  const isBlockMode = blockCount != null
  const cursorMax = isBlockMode ? Math.max(0, blockCount - 1) : Math.max(0, totalLines - 1)
  const maxScroll = Math.max(0, totalLines - viewportHeight)
  const maxLine = Math.max(0, totalLines - 1)

  const clampScroll = useCallback(
    (value: number) => Math.max(0, Math.min(value, maxScroll)),
    [maxScroll],
  )

  const clampLine = useCallback(
    (value: number) => Math.max(0, Math.min(value, maxLine)),
    [maxLine],
  )

  const clampCursor = useCallback(
    (value: number) => Math.max(0, Math.min(value, cursorMax)),
    [cursorMax],
  )

  // When entering cursor mode, initialize cursor
  const prevMode = useRef(mode)
  useEffect(() => {
    if (mode === "cursor" && prevMode.current !== "cursor" && prevMode.current !== "select") {
      setCursor({ line: scrollOffset, col: 0 })
    }
    if (mode === "select" && prevMode.current === "cursor" && cursor) {
      setSelectionAnchor({ ...cursor })
    }
    if (mode === "command") {
      setCursor(null)
      setSelectionAnchor(null)
    }
    prevMode.current = mode
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to keep cursor visible
  const scrollToCursor = useCallback((cursorIndex: number) => {
    const line = isBlockMode && blockLineMap ? (blockLineMap[cursorIndex] ?? 0) : cursorIndex
    setScrollOffset((offset) => {
      if (line < offset) return line
      if (line >= offset + viewportHeight) return clampScroll(line - viewportHeight + 1)
      return offset
    })
  }, [viewportHeight, clampScroll, isBlockMode, blockLineMap])

  // === COMMAND MODE ===

  useCommand({
    id: "scroll-down",
    title: "Scroll down",
    hotkey: "j",
    modes: ["command"],
    handler: () => setScrollOffset((o) => clampScroll(o + 1)),
  })

  useCommand({
    id: "scroll-up",
    title: "Scroll up",
    hotkey: "k",
    modes: ["command"],
    handler: () => setScrollOffset((o) => clampScroll(o - 1)),
  })

  useCommand({
    id: "scroll-half-down",
    title: "Scroll half page down",
    hotkey: "ctrl+d",
    modes: ["command"],
    handler: () => setScrollOffset((o) => clampScroll(o + Math.floor(viewportHeight / 2))),
  })

  useCommand({
    id: "scroll-half-up",
    title: "Scroll half page up",
    hotkey: "ctrl+u",
    modes: ["command"],
    handler: () => setScrollOffset((o) => clampScroll(o - Math.floor(viewportHeight / 2))),
  })

  useCommand({
    id: "scroll-top",
    title: "Scroll to top",
    hotkey: "g g",
    modes: ["command"],
    handler: () => setScrollOffset(0),
  })

  useCommand({
    id: "scroll-bottom",
    title: "Scroll to bottom",
    hotkey: "shift+g",
    modes: ["command"],
    handler: () => setScrollOffset(maxScroll),
  })

  useCommand({
    id: "search-start",
    title: "Search",
    hotkey: "/",
    modes: ["command"],
    handler: () => {
      preSearchModeRef.current = mode
      setSearchActive(true)
      setSearchQuery("")
      setMode("insert")
    },
  })

  useCommand({
    id: "search-next",
    title: "Next match",
    hotkey: "n",
    modes: ["command"],
    when: () => !searchActive,
    handler: () => {
      const matches = matchingLinesRef.current
      if (matches.length === 0) return
      setCurrentMatchIndex((idx) => {
        const next = (idx + 1) % matches.length
        const line = matches[next]
        setScrollOffset(Math.max(0, Math.min(line, maxScroll)))
        return next
      })
    },
  })

  useCommand({
    id: "search-prev",
    title: "Previous match",
    hotkey: "shift+n",
    modes: ["command"],
    when: () => !searchActive,
    handler: () => {
      const matches = matchingLinesRef.current
      if (matches.length === 0) return
      setCurrentMatchIndex((idx) => {
        const next = (idx - 1 + matches.length) % matches.length
        const line = matches[next]
        setScrollOffset(Math.max(0, Math.min(line, maxScroll)))
        return next
      })
    },
  })

  // === CURSOR MODE ===

  useCommand({
    id: "cursor-down",
    title: "Cursor down",
    hotkey: "j",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampCursor(c.line + 1)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-up",
    title: "Cursor up",
    hotkey: "k",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampCursor(c.line - 1)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-half-down",
    title: "Cursor half page down",
    hotkey: "ctrl+d",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const step = isBlockMode ? Math.floor(cursorMax / 4) || 1 : Math.floor(viewportHeight / 2)
        const next = clampCursor(c.line + step)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-half-up",
    title: "Cursor half page up",
    hotkey: "ctrl+u",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const step = isBlockMode ? Math.floor(cursorMax / 4) || 1 : Math.floor(viewportHeight / 2)
        const next = clampCursor(c.line - step)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-top",
    title: "Cursor to top",
    hotkey: "g g",
    modes: ["cursor"],
    handler: () => {
      setCursor({ line: 0, col: 0 })
      setScrollOffset(0)
    },
  })

  useCommand({
    id: "cursor-bottom",
    title: "Cursor to bottom",
    hotkey: "shift+g",
    modes: ["cursor"],
    handler: () => {
      setCursor({ line: cursorMax, col: 0 })
      if (isBlockMode && blockLineMap) {
        const line = blockLineMap[cursorMax] ?? 0
        setScrollOffset(clampScroll(line))
      } else {
        setScrollOffset(maxScroll)
      }
    },
  })

  useCommand({
    id: "cursor-search-start",
    title: "Search",
    hotkey: "/",
    modes: ["cursor"],
    handler: () => {
      preSearchModeRef.current = mode
      setSearchActive(true)
      setSearchQuery("")
      setMode("insert")
    },
  })

  useCommand({
    id: "cursor-search-next",
    title: "Next match",
    hotkey: "n",
    modes: ["cursor"],
    when: () => !searchActive,
    handler: () => {
      const matches = matchingLinesRef.current
      if (matches.length === 0) return
      setCurrentMatchIndex((idx) => {
        const next = (idx + 1) % matches.length
        const line = matches[next]
        setCursor({ line, col: 0 })
        scrollToCursor(line)
        return next
      })
    },
  })

  useCommand({
    id: "cursor-search-prev",
    title: "Previous match",
    hotkey: "shift+n",
    modes: ["cursor"],
    when: () => !searchActive,
    handler: () => {
      const matches = matchingLinesRef.current
      if (matches.length === 0) return
      setCurrentMatchIndex((idx) => {
        const next = (idx - 1 + matches.length) % matches.length
        const line = matches[next]
        setCursor({ line, col: 0 })
        scrollToCursor(line)
        return next
      })
    },
  })

  // === SELECT MODE ===

  useCommand({
    id: "select-down",
    title: "Extend selection down",
    hotkey: "j",
    modes: ["select"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampCursor(c.line + 1)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "select-up",
    title: "Extend selection up",
    hotkey: "k",
    modes: ["select"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampCursor(c.line - 1)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "select-copy",
    title: "Copy selection",
    hotkey: "y",
    modes: ["select"],
    handler: () => {
      if (!getText || !selectionAnchor || !cursor) return
      const text = getText()
      if (!text) return

      if (isBlockMode && blockLineMap) {
        // Block-based copy: use blockLineMap to find line ranges
        const startBlock = Math.min(selectionAnchor.line, cursor.line)
        const endBlock = Math.max(selectionAnchor.line, cursor.line)
        const startLine = blockLineMap[startBlock] ?? 0
        const endLine = endBlock + 1 < blockLineMap.length ? (blockLineMap[endBlock + 1] ?? text.split("\n").length) : text.split("\n").length
        const lines = text.split("\n")
        const selected = lines.slice(startLine, endLine).join("\n")
        if (selected) {
          void copyToClipboard(selected)
        }
      } else {
        const lines = text.split("\n")
        const startLine = Math.min(selectionAnchor.line, cursor.line)
        const endLine = Math.max(selectionAnchor.line, cursor.line)
        const selected = lines.slice(startLine, endLine + 1).join("\n")
        if (selected) {
          void copyToClipboard(selected)
        }
      }
      setMode("command")
    },
  })

  useCommand({
    id: "select-cancel",
    title: "Cancel selection",
    hotkey: "escape",
    modes: ["select"],
    handler: () => setMode("cursor"),
  })

  // === MODE TRANSITIONS ===

  useCommand({
    id: "enter-cursor",
    title: "Enter cursor mode",
    hotkey: "v",
    modes: ["command"],
    handler: () => setMode("cursor"),
  })

  useCommand({
    id: "enter-select",
    title: "Enter select mode",
    hotkey: "v",
    modes: ["cursor"],
    handler: () => setMode("select"),
  })

  useCommand({
    id: "exit-to-command",
    title: "Exit to command mode",
    hotkey: "escape",
    modes: ["cursor"],
    when: () => !searchActive,
    handler: () => setMode("command"),
  })

  // === SEARCH CANCEL (any mode) ===

  useCommand({
    id: "search-cancel",
    title: "Cancel search",
    hotkey: "escape",
    modes: ["command", "cursor", "select", "insert"],
    when: () => searchActive,
    handler: () => {
      setSearchActive(false)
      setSearchQuery("")
      setMatchingLines([])
      setCurrentMatchIndex(0)
      setMode(preSearchModeRef.current)
    },
  })

  // Compute selection from anchor + cursor
  const selection = selectionAnchor && cursor && mode === "select"
    ? {
        start: selectionAnchor.line <= cursor.line ? selectionAnchor : cursor,
        end: selectionAnchor.line <= cursor.line ? cursor : selectionAnchor,
      }
    : null

  const submitSearch = useCallback(() => {
    setSearchActive(false)
    setMode(preSearchModeRef.current)
  }, [setMode])

  return {
    mode,
    setMode,
    scrollOffset,
    cursor,
    selection,
    searchQuery,
    searchActive,
    setSearchQuery,
    matchingLines,
    currentMatchIndex,
    submitSearch,
  }
}
