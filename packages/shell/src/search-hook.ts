import { useCallback, useMemo, useRef, useState } from "react"
import { useCommand, useMode, useSetMode, type Mode } from "@tooee/commands"

export interface UseSearchOptions {
  match: (query: string) => number[]
  onJump: (index: number) => void
}

export interface SearchState {
  searchQuery: string
  searchActive: boolean
  setSearchQuery: (query: string) => void
  matchingLines: number[]
  currentMatchIndex: number
  submitSearch: () => void
}

const EMPTY: number[] = []
const CURSOR_MODES: Mode[] = ["cursor"]
const ALL_MODES: Mode[] = ["cursor", "select", "insert"]

export function useSearch({ match, onJump }: UseSearchOptions): SearchState {
  const mode = useMode()
  const setMode = useSetMode()

  const [searchQuery, setSearchQuery] = useState("")
  const [searchActive, setSearchActive] = useState(false)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [committedQuery, setCommittedQuery] = useState("")
  const preSearchModeRef = useRef<Mode>("cursor")

  const matchRef = useRef(match)
  matchRef.current = match

  const onJumpRef = useRef(onJump)
  onJumpRef.current = onJump

  const activeQuery = searchActive ? searchQuery : committedQuery

  const matchingLines = useMemo(() => {
    if (!activeQuery) return EMPTY
    return matchRef.current(activeQuery)
  }, [activeQuery])

  const matchingLinesRef = useRef(matchingLines)
  matchingLinesRef.current = matchingLines

  // Imperatively set search query, reset match index, and jump to first match.
  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query)
    setCurrentMatchIndex(0)
    const matches = query ? matchRef.current(query) : []
    if (matches[0] != null) {
      onJumpRef.current(matches[0])
    }
  }, [])

  useCommand({
    id: "cursor-search-start",
    title: "Search",
    hotkey: "/",
    modes: CURSOR_MODES,
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
    modes: CURSOR_MODES,
    when: () => !searchActive,
    handler: () => {
      const matches = matchingLinesRef.current
      if (matches.length === 0) return

      setCurrentMatchIndex((index) => {
        const nextIndex = (index + 1) % matches.length
        const nextMatch = matches[nextIndex]
        if (nextMatch != null) {
          onJumpRef.current(nextMatch)
        }
        return nextIndex
      })
    },
  })

  useCommand({
    id: "cursor-search-prev",
    title: "Previous match",
    hotkey: "shift+n",
    modes: CURSOR_MODES,
    when: () => !searchActive,
    handler: () => {
      const matches = matchingLinesRef.current
      if (matches.length === 0) return

      setCurrentMatchIndex((index) => {
        const nextIndex = (index - 1 + matches.length) % matches.length
        const nextMatch = matches[nextIndex]
        if (nextMatch != null) {
          onJumpRef.current(nextMatch)
        }
        return nextIndex
      })
    },
  })

  useCommand({
    id: "search-cancel",
    title: "Cancel search",
    hotkey: "escape",
    modes: ALL_MODES,
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
    setCommittedQuery(searchQuery)
    setSearchActive(false)
    setCurrentMatchIndex(0)
    const matches = searchQuery ? matchRef.current(searchQuery) : []
    if (matches[0] != null) {
      onJumpRef.current(matches[0])
    }
    setMode(preSearchModeRef.current)
  }, [searchQuery, setMode])

  return {
    searchQuery,
    searchActive,
    setSearchQuery: updateSearchQuery,
    matchingLines,
    currentMatchIndex,
    submitSearch,
  }
}
