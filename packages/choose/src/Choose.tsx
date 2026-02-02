import { useState, useEffect, useRef, useCallback } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { AppLayout, useTheme } from "@tooee/react"
import { useThemeCommands } from "@tooee/shell"
import { useMode, useSetMode, useCommand } from "@tooee/commands"
import type { ChooseItem, ChooseContentProvider, ChooseOptions, ChooseResult } from "./types.ts"
import { fuzzyFilter, type FuzzyMatch } from "./fuzzy.ts"

interface ChooseProps {
  contentProvider: ChooseContentProvider
  options?: ChooseOptions
  onConfirm: (result: ChooseResult) => void
  onCancel: () => void
}

export function Choose({ contentProvider, options, onConfirm, onCancel }: ChooseProps) {
  const { theme } = useTheme()
  const [items, setItems] = useState<ChooseItem[]>([])
  const [filterQuery, setFilterQuery] = useState("")
  const [filteredItems, setFilteredItems] = useState<FuzzyMatch[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  const multi = options?.multi ?? false

  useEffect(() => {
    const result = contentProvider.load()
    if (result instanceof Promise) {
      result.then((loaded) => {
        setItems(loaded)
        setFilteredItems(fuzzyFilter(loaded, ""))
        setLoading(false)
      })
    } else {
      setItems(result)
      setFilteredItems(fuzzyFilter(result, ""))
      setLoading(false)
    }
  }, [contentProvider])

  useEffect(() => {
    const matches = fuzzyFilter(items, filterQuery)
    setFilteredItems(matches)
    setActiveIndex(0)
  }, [filterQuery, items])

  const { name: themeName } = useThemeCommands()
  const mode = useMode()
  const setMode = useSetMode()

  // Register a/i to return to insert mode from command mode
  useCommand({
    id: "choose:insert-mode-a",
    title: "Insert mode",
    hotkey: "a",
    modes: ["command"],
    handler: () => setMode("insert"),
    hidden: true,
  })
  useCommand({
    id: "choose:insert-mode-i",
    title: "Insert mode",
    hotkey: "i",
    modes: ["command"],
    handler: () => setMode("insert"),
    hidden: true,
  })

  const moveUp = useCallback(() => {
    setActiveIndex((i) => Math.max(0, i - 1))
  }, [])

  const moveDown = useCallback(() => {
    setActiveIndex((i) => Math.min(filteredItems.length - 1, i + 1))
  }, [filteredItems.length])

  const toggleSelection = useCallback((index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev)
      const origIndex = filteredItems[index]?.originalIndex
      if (origIndex === undefined) return prev
      if (next.has(origIndex)) {
        next.delete(origIndex)
      } else {
        next.add(origIndex)
      }
      return next
    })
  }, [filteredItems])

  const confirm = useCallback(() => {
    if (multi) {
      const selected = Array.from(selectedIndices).map((i) => items[i])
      if (selected.length === 0 && filteredItems[activeIndex]) {
        onConfirm({ items: [filteredItems[activeIndex].item] })
      } else {
        onConfirm({ items: selected })
      }
    } else {
      const match = filteredItems[activeIndex]
      if (match) {
        onConfirm({ items: [match.item] })
      } else {
        onCancel()
      }
    }
  }, [multi, selectedIndices, items, filteredItems, activeIndex, onConfirm, onCancel])

  useKeyboard((key) => {
    if (key.name === "escape") {
      if (mode === "insert") {
        // Switch to command mode (allows theme switching, quit, etc.)
        setMode("command")
      } else {
        // In command mode, escape cancels
        onCancel()
      }
      return
    }
    if (key.name === "return") {
      confirm()
      return
    }
    if (key.name === "up" || (key.ctrl && key.name === "p")) {
      moveUp()
      return
    }
    if (key.name === "down" || (key.ctrl && key.name === "n")) {
      moveDown()
      return
    }
    if (multi && key.name === "tab") {
      if (key.shift) {
        toggleSelection(activeIndex)
        moveUp()
      } else {
        toggleSelection(activeIndex)
        moveDown()
      }
      return
    }
  })

  // Auto-scroll to keep active item visible
  useEffect(() => {
    if (scrollRef.current && filteredItems.length > 0) {
      // Each item is ~1 line tall; approximate scroll
      scrollRef.current.scrollTop = Math.max(0, activeIndex - 5)
    }
  }, [activeIndex, filteredItems.length])

  if (loading) {
    return (
      <box>
        <text content="Loading..." fg={theme.textMuted} />
      </box>
    )
  }

  const selectedCount = selectedIndices.size
  const hintParts = mode === "insert"
    ? ["↑↓ navigate", "Enter confirm", "Esc commands"]
    : ["i insert", "Esc quit", "Enter confirm"]
  if (multi && mode === "insert") hintParts.splice(2, 0, "Tab toggle")
  const hint = hintParts.join("  ")

  return (
    <AppLayout
      titleBar={options?.prompt ? { title: options.prompt } : undefined}
      statusBar={{
        items: [
          { label: "Matches:", value: `${filteredItems.length}/${items.length}` },
          ...(multi ? [{ label: "Selected:", value: String(selectedCount) }] : []),
          { label: "Theme:", value: themeName },
          { label: "", value: hint },
        ],
      }}
      scrollRef={scrollRef}
      scrollProps={{ focused: false }}
    >
      <box flexDirection="column">
        {/* Filter input row */}
        <box flexDirection="row" height={1} style={{ paddingLeft: 1, paddingRight: 1 }}>
          <text content="> " fg={theme.accent} />
          <input
            focused={mode === "insert"}
            placeholder={options?.placeholder ?? "Filter..."}
            onInput={setFilterQuery}
            backgroundColor="transparent"
            textColor={theme.text}
            placeholderColor={theme.textMuted}
            cursorColor={theme.primary}
            style={{ flexGrow: 1 }}
          />
          <text content={` ${filteredItems.length}/${items.length}`} fg={theme.textMuted} />
        </box>

        {/* Item list */}
        {filteredItems.map((match, idx) => {
          const isActive = idx === activeIndex
          const isSelected = selectedIndices.has(match.originalIndex)
          return (
            <box
              key={match.originalIndex}
              flexDirection="row"
              height={1}
              backgroundColor={isActive ? theme.backgroundElement : undefined}
              style={{ paddingLeft: 1 }}
            >
              {multi && (
                <text
                  content={isSelected ? "✓ " : "  "}
                  fg={isSelected ? theme.accent : theme.textMuted}
                />
              )}
              {match.item.icon && (
                <text content={`${match.item.icon} `} fg={theme.textMuted} />
              )}
              <text fg={isActive ? theme.primary : theme.text}>
                {renderHighlightedText(match.item.text, match.positions, theme.warning)}
              </text>
              {match.item.description && (
                <text content={`  ${match.item.description}`} fg={theme.textMuted} />
              )}
            </box>
          )
        })}
      </box>
    </AppLayout>
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
