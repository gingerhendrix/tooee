import { useState, useEffect, useRef, useMemo, useCallback, type MutableRefObject } from "react"
import { useCommand, type Mode } from "@tooee/commands"
import { findMatchingLines } from "../search.js"
import type { ModalCoreState } from "./index.js"

export interface SearchState {
  searchQuery: string
  searchActive: boolean
  setSearchQuery: (query: string) => void
  matchingLines: number[]
  matchingLinesRef: MutableRefObject<number[]>
  currentMatchIndex: number
  submitSearch: () => void
}

export function useSearchCommands(
  state: ModalCoreState,
  opts: {
    getText?: () => string | undefined
  },
): SearchState {
  const { setCursor, mode, setMode } = state
  const { getText } = opts

  const [searchQuery, setSearchQuery] = useState("")
  const [searchActive, setSearchActive] = useState(false)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const preSearchModeRef = useRef<Mode>("cursor")

  // Track the "committed" search query (persists after search bar closes)
  const [committedQuery, setCommittedQuery] = useState("")

  // Derived state: search matches computed from committed query + content
  const matchingLines = useMemo(() => {
    if (!committedQuery) return []
    const text = getText?.()
    return text ? findMatchingLines(text, committedQuery) : []
  }, [committedQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  // Live-update committed query while search bar is open
  useEffect(() => {
    if (searchActive && searchQuery) {
      setCommittedQuery(searchQuery)
    }
  }, [searchActive, searchQuery])

  const matchingLinesRef = useRef(matchingLines)
  matchingLinesRef.current = matchingLines

  // Auto-jump to first match when search results change
  useEffect(() => {
    setCurrentMatchIndex(0)
    if (matchingLines.length > 0) {
      setCursor((c) => (c ? { line: matchingLines[0], col: 0 } : c))
    }
  }, [matchingLines]) // eslint-disable-line react-hooks/exhaustive-deps

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
        return next
      })
    },
  })

  useCommand({
    id: "search-cancel",
    title: "Cancel search",
    hotkey: "escape",
    modes: ["cursor", "select", "insert"],
    when: () => searchActive,
    handler: () => {
      setSearchActive(false)
      setSearchQuery("")
      setCommittedQuery("")
      setCurrentMatchIndex(0)
      setMode(preSearchModeRef.current)
    },
  })

  const submitSearch = useCallback(() => {
    setSearchActive(false)
    setMode(preSearchModeRef.current)
  }, [setMode])

  return {
    searchQuery,
    searchActive,
    setSearchQuery,
    matchingLines,
    matchingLinesRef,
    currentMatchIndex,
    submitSearch,
  }
}
