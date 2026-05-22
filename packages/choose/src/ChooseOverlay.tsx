import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "@tooee/themes"
import { useMode, useSetMode } from "@tooee/commands"
import type { ChooseItem } from "./types.js"
import { fuzzyFilter } from "./fuzzy.js"

export interface ChooseOverlayProps {
  items: ChooseItem[] | (() => Promise<ChooseItem[]>)
  prompt?: string
  placeholder?: string
  emptyMessage?: string
  onSelect: (item: ChooseItem) => void | Promise<void>
  onCancel: () => void
}

export function ChooseOverlay({
  items: itemsOrLoader,
  prompt,
  placeholder,
  emptyMessage,
  onSelect,
  onCancel,
}: ChooseOverlayProps) {
  const { theme } = useTheme()
  const mode = useMode()
  const setMode = useSetMode()

  const [items, setItems] = useState<ChooseItem[]>(
    Array.isArray(itemsOrLoader) ? itemsOrLoader : [],
  )
  const [loading, setLoading] = useState(!Array.isArray(itemsOrLoader))
  const [filterQuery, setFilterQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  // Load items if async loader provided
  useEffect(() => {
    if (typeof itemsOrLoader === "function") {
      itemsOrLoader().then((loaded) => {
        setItems(loaded)
        setLoading(false)
      })
    }
  }, [itemsOrLoader])

  // Filtered items via fuzzy matching
  const filteredItems = useMemo(() => fuzzyFilter(items, filterQuery), [items, filterQuery])

  // Reset activeIndex when filter changes
  const [prevFilterQuery, setPrevFilterQuery] = useState("")
  if (filterQuery !== prevFilterQuery) {
    setPrevFilterQuery(filterQuery)
    setActiveIndex(0)
  }

  const moveUp = useCallback(() => {
    setActiveIndex((i) => Math.max(0, i - 1))
  }, [])

  const moveDown = useCallback(() => {
    setActiveIndex((i) => Math.min(filteredItems.length - 1, i + 1))
  }, [filteredItems.length])

  const confirm = useCallback(() => {
    const match = filteredItems[activeIndex]
    if (match) {
      onSelect(match.item)
    }
  }, [filteredItems, activeIndex, onSelect])

  useKeyboard((key) => {
    if (key.name === "escape") {
      key.preventDefault()
      if (mode === "insert") {
        setMode("cursor")
      } else {
        onCancel()
      }
      return
    }

    if (mode === "cursor") {
      if (key.raw === "i" || key.raw === "a") {
        key.preventDefault()
        setMode("insert")
        return
      }
      if (key.raw === "j") {
        key.preventDefault()
        moveDown()
        return
      }
      if (key.raw === "k") {
        key.preventDefault()
        moveUp()
        return
      }
    }

    if (key.name === "return") {
      key.preventDefault()
      confirm()
      return
    }

    if (key.name === "up" || (key.ctrl && key.name === "p")) {
      key.preventDefault()
      moveUp()
      return
    }
    if (key.name === "down" || (key.ctrl && key.name === "n")) {
      key.preventDefault()
      moveDown()
      return
    }
  })

  // Auto-scroll to keep active item visible
  useEffect(() => {
    if (scrollRef.current && filteredItems.length > 0) {
      scrollRef.current.scrollTop = Math.max(0, activeIndex - 5)
    }
  }, [activeIndex, filteredItems.length])

  const hintText =
    mode === "insert" ? "Enter confirm  Esc commands" : "j/k navigate  i insert  Esc cancel"

  return (
    <box
      position="absolute"
      left="20%"
      right="20%"
      top="20%"
      bottom="20%"
      flexDirection="column"
      backgroundColor={theme.backgroundPanel}
      border
      borderColor={theme.borderActive}
    >
      {/* Title bar */}
      {prompt && (
        <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={theme.backgroundElement}>
          <text content={prompt} fg={theme.accent} />
        </box>
      )}

      {/* Filter input row */}
      <box flexDirection="row" height={1} style={{ paddingLeft: 1, paddingRight: 1 }}>
        <text content="> " fg={theme.accent} />
        <input
          focused={mode === "insert"}
          placeholder={placeholder ?? "Filter..."}
          onInput={setFilterQuery}
          backgroundColor="transparent"
          textColor={theme.text}
          placeholderColor={theme.textMuted}
          cursorColor={theme.primary}
          style={{ flexGrow: 1 }}
        />
        <text content={` ${filteredItems.length}/${items.length}`} fg={theme.textMuted} />
      </box>

      {/* Scrollable item list */}
      <scrollbox ref={scrollRef} flexDirection="column" style={{ flexGrow: 1 }} focused={false}>
        {loading && (
          <box height={1} style={{ paddingLeft: 2 }}>
            <text content="Loading..." fg={theme.textMuted} />
          </box>
        )}

        {!loading && filteredItems.length === 0 && emptyMessage && (
          <box height={1} style={{ paddingLeft: 2 }}>
            <text content={emptyMessage} fg={theme.textMuted} />
          </box>
        )}

        {filteredItems.map((match, idx) => {
          const isActive = idx === activeIndex
          return (
            <box
              key={match.originalIndex}
              flexDirection="row"
              height={1}
              backgroundColor={isActive ? theme.backgroundElement : undefined}
              style={{ paddingLeft: 1 }}
            >
              {match.item.icon && <text content={`${match.item.icon} `} fg={theme.textMuted} />}
              <text fg={isActive ? theme.primary : theme.text}>
                {renderHighlightedText(match.item.text, match.positions, theme.warning)}
              </text>
              {match.item.description && (
                <text content={`  ${match.item.description}`} fg={theme.textMuted} />
              )}
            </box>
          )
        })}
      </scrollbox>

      {/* Hint line */}
      <box height={1} paddingLeft={1} paddingRight={1} backgroundColor={theme.backgroundElement}>
        <text content={hintText} fg={theme.textMuted} />
      </box>
    </box>
  )
}

function renderHighlightedText(text: string, positions: number[], highlightColor: string) {
  if (positions.length === 0) {
    return text
  }

  const posSet = new Set(positions)
  const parts: Array<{ text: string; highlight: boolean }> = []
  let current = ""
  let currentHighlight = false

  for (let i = 0; i < text.length; i++) {
    const isHighlight = posSet.has(i)
    if (i === 0) {
      currentHighlight = isHighlight
      current = text[i]
    } else if (isHighlight === currentHighlight) {
      current += text[i]
    } else {
      parts.push({ text: current, highlight: currentHighlight })
      current = text[i]
      currentHighlight = isHighlight
    }
  }
  if (current) {
    parts.push({ text: current, highlight: currentHighlight })
  }

  return parts.map((part, i) =>
    part.highlight ? (
      <span key={i} fg={highlightColor}>
        {part.text}
      </span>
    ) : (
      part.text
    ),
  )
}
