import { useState, useCallback, useRef, useEffect } from "react"
import { useCommand, useMode, useSetMode, type Mode } from "@tooee/commands"
import { copyToClipboard } from "@tooee/react"

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
}

export interface ModalNavigationOptions {
  totalLines: number
  viewportHeight: number
  getText?: () => string | undefined
}

export function useModalNavigationCommands(opts: ModalNavigationOptions): ModalNavigationState {
  const { totalLines, viewportHeight, getText } = opts
  const mode = useMode()
  const setMode = useSetMode()

  const [scrollOffset, setScrollOffset] = useState(0)
  const [cursor, setCursor] = useState<Position | null>(null)
  const [selectionAnchor, setSelectionAnchor] = useState<Position | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchActive, setSearchActive] = useState(false)

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
  const scrollToCursor = useCallback((line: number) => {
    setScrollOffset((offset) => {
      if (line < offset) return line
      if (line >= offset + viewportHeight) return clampScroll(line - viewportHeight + 1)
      return offset
    })
  }, [viewportHeight, clampScroll])

  // === COMMAND MODE ===

  useCommand({
    id: "scroll-down",
    title: "Scroll down",
    defaultHotkey: "j",
    modes: ["command"],
    handler: () => setScrollOffset((o) => clampScroll(o + 1)),
  })

  useCommand({
    id: "scroll-up",
    title: "Scroll up",
    defaultHotkey: "k",
    modes: ["command"],
    handler: () => setScrollOffset((o) => clampScroll(o - 1)),
  })

  useCommand({
    id: "scroll-half-down",
    title: "Scroll half page down",
    defaultHotkey: "ctrl+d",
    modes: ["command"],
    handler: () => setScrollOffset((o) => clampScroll(o + Math.floor(viewportHeight / 2))),
  })

  useCommand({
    id: "scroll-half-up",
    title: "Scroll half page up",
    defaultHotkey: "ctrl+u",
    modes: ["command"],
    handler: () => setScrollOffset((o) => clampScroll(o - Math.floor(viewportHeight / 2))),
  })

  useCommand({
    id: "scroll-top",
    title: "Scroll to top",
    defaultHotkey: "gg",
    modes: ["command"],
    handler: () => setScrollOffset(0),
  })

  useCommand({
    id: "scroll-bottom",
    title: "Scroll to bottom",
    defaultHotkey: "shift+g",
    modes: ["command"],
    handler: () => setScrollOffset(maxScroll),
  })

  useCommand({
    id: "search-start",
    title: "Search",
    defaultHotkey: "/",
    modes: ["command"],
    handler: () => {
      setSearchActive(true)
      setSearchQuery("")
    },
  })

  useCommand({
    id: "search-next",
    title: "Next match",
    defaultHotkey: "n",
    modes: ["command"],
    when: () => !searchActive,
    handler: () => {
      // Stub: actual matching depends on content
    },
  })

  useCommand({
    id: "search-prev",
    title: "Previous match",
    defaultHotkey: "shift+n",
    modes: ["command"],
    when: () => !searchActive,
    handler: () => {
      // Stub: actual matching depends on content
    },
  })

  // === CURSOR MODE ===

  useCommand({
    id: "cursor-down",
    title: "Cursor down",
    defaultHotkey: "j",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampLine(c.line + 1)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-up",
    title: "Cursor up",
    defaultHotkey: "k",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampLine(c.line - 1)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-half-down",
    title: "Cursor half page down",
    defaultHotkey: "ctrl+d",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampLine(c.line + Math.floor(viewportHeight / 2))
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-half-up",
    title: "Cursor half page up",
    defaultHotkey: "ctrl+u",
    modes: ["cursor"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampLine(c.line - Math.floor(viewportHeight / 2))
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "cursor-top",
    title: "Cursor to top",
    defaultHotkey: "gg",
    modes: ["cursor"],
    handler: () => {
      setCursor({ line: 0, col: 0 })
      setScrollOffset(0)
    },
  })

  useCommand({
    id: "cursor-bottom",
    title: "Cursor to bottom",
    defaultHotkey: "shift+g",
    modes: ["cursor"],
    handler: () => {
      setCursor({ line: maxLine, col: 0 })
      setScrollOffset(maxScroll)
    },
  })

  useCommand({
    id: "cursor-search-start",
    title: "Search",
    defaultHotkey: "/",
    modes: ["cursor"],
    handler: () => {
      setSearchActive(true)
      setSearchQuery("")
    },
  })

  useCommand({
    id: "cursor-search-next",
    title: "Next match",
    defaultHotkey: "n",
    modes: ["cursor"],
    when: () => !searchActive,
    handler: () => {
      // Stub
    },
  })

  useCommand({
    id: "cursor-search-prev",
    title: "Previous match",
    defaultHotkey: "shift+n",
    modes: ["cursor"],
    when: () => !searchActive,
    handler: () => {
      // Stub
    },
  })

  // === SELECT MODE ===

  useCommand({
    id: "select-down",
    title: "Extend selection down",
    defaultHotkey: "j",
    modes: ["select"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampLine(c.line + 1)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "select-up",
    title: "Extend selection up",
    defaultHotkey: "k",
    modes: ["select"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        const next = clampLine(c.line - 1)
        scrollToCursor(next)
        return { line: next, col: 0 }
      })
    },
  })

  useCommand({
    id: "select-copy",
    title: "Copy selection",
    defaultHotkey: "y",
    modes: ["select"],
    handler: () => {
      if (!getText || !selectionAnchor || !cursor) return
      const text = getText()
      if (!text) return
      const lines = text.split("\n")
      const startLine = Math.min(selectionAnchor.line, cursor.line)
      const endLine = Math.max(selectionAnchor.line, cursor.line)
      const selected = lines.slice(startLine, endLine + 1).join("\n")
      if (selected) {
        void copyToClipboard(selected)
      }
      setMode("command")
    },
  })

  useCommand({
    id: "select-cancel",
    title: "Cancel selection",
    defaultHotkey: "escape",
    modes: ["select"],
    handler: () => setMode("cursor"),
  })

  // === MODE TRANSITIONS ===

  useCommand({
    id: "enter-select",
    title: "Enter select mode",
    defaultHotkey: "v",
    modes: ["cursor"],
    handler: () => setMode("select"),
  })

  useCommand({
    id: "exit-to-command",
    title: "Exit to command mode",
    defaultHotkey: "escape",
    modes: ["cursor"],
    when: () => !searchActive,
    handler: () => setMode("command"),
  })

  // === SEARCH CANCEL (any mode) ===

  useCommand({
    id: "search-cancel",
    title: "Cancel search",
    defaultHotkey: "escape",
    modes: ["command", "cursor", "select"],
    when: () => searchActive,
    handler: () => {
      setSearchActive(false)
      setSearchQuery("")
    },
  })

  // Compute selection from anchor + cursor
  const selection = selectionAnchor && cursor && mode === "select"
    ? {
        start: selectionAnchor.line <= cursor.line ? selectionAnchor : cursor,
        end: selectionAnchor.line <= cursor.line ? cursor : selectionAnchor,
      }
    : null

  return {
    mode,
    setMode,
    scrollOffset,
    cursor,
    selection,
    searchQuery,
    searchActive,
    setSearchQuery,
  }
}
