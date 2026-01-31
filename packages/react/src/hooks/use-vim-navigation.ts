import { useCallback, useState } from "react"
import { useKeyboard } from "@opentui/react"
import type { KeyEvent } from "@opentui/core"

export interface VimNavigationOptions {
  totalLines: number
  viewportHeight: number
  onSearch?: (query: string) => void
}

export interface VimNavigationState {
  scrollOffset: number
  searchQuery: string
  searchActive: boolean
}

export function useVimNavigation(options: VimNavigationOptions): VimNavigationState {
  const { totalLines, viewportHeight } = options
  const [scrollOffset, setScrollOffset] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchActive, setSearchActive] = useState(false)

  const maxScroll = Math.max(0, totalLines - viewportHeight)

  const clamp = useCallback(
    (value: number) => Math.max(0, Math.min(value, maxScroll)),
    [maxScroll],
  )

  useKeyboard((event: KeyEvent) => {
    if (event.defaultPrevented) return

    // Search mode input handling
    if (searchActive) {
      if (event.name === "escape") {
        event.preventDefault()
        setSearchActive(false)
        setSearchQuery("")
        return
      }
      if (event.name === "return") {
        event.preventDefault()
        setSearchActive(false)
        options.onSearch?.(searchQuery)
        return
      }
      if (event.name === "backspace") {
        event.preventDefault()
        setSearchQuery((q) => q.slice(0, -1))
        return
      }
      if (event.name.length === 1 && !event.ctrl && !event.meta) {
        event.preventDefault()
        setSearchQuery((q) => q + event.name)
        return
      }
      return
    }

    // Normal mode
    if (event.name === "j" && !event.ctrl) {
      event.preventDefault()
      setScrollOffset((o) => clamp(o + 1))
    } else if (event.name === "k" && !event.ctrl) {
      event.preventDefault()
      setScrollOffset((o) => clamp(o - 1))
    } else if (event.name === "g" && !event.ctrl) {
      // gg is handled by command sequence tracker; single g goes to top
      event.preventDefault()
      setScrollOffset(0)
    } else if (event.name === "G" && event.shift) {
      event.preventDefault()
      setScrollOffset(maxScroll)
    } else if (event.name === "d" && event.ctrl) {
      event.preventDefault()
      setScrollOffset((o) => clamp(o + Math.floor(viewportHeight / 2)))
    } else if (event.name === "u" && event.ctrl) {
      event.preventDefault()
      setScrollOffset((o) => clamp(o - Math.floor(viewportHeight / 2)))
    } else if (event.name === "/" && !event.ctrl) {
      event.preventDefault()
      setSearchActive(true)
      setSearchQuery("")
    }
  })

  return { scrollOffset, searchQuery, searchActive }
}
