import { useState, useMemo, useCallback } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "../theme.tsx"

export interface CommandPaletteEntry {
  id: string
  title: string
  hotkey?: string
  category?: string
  icon?: string
}

interface CommandPaletteProps {
  commands: CommandPaletteEntry[]
  onSelect: (commandId: string) => void
  onClose: () => void
}

function fuzzyMatch(query: string, text: string): number | null {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()

  let qi = 0
  let score = 0
  let lastMatchIndex = -2

  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      // Start of string bonus
      if (ti === 0) score += 3
      // Word boundary bonus (after space, hyphen, dot, slash)
      else if (" -./".includes(lowerText[ti - 1]!)) score += 2
      // Consecutive bonus
      else if (ti === lastMatchIndex + 1) score += 1

      lastMatchIndex = ti
      qi++
    }
  }

  return qi === lowerQuery.length ? score : null
}

export function CommandPalette({ commands, onSelect, onClose }: CommandPaletteProps) {
  const { theme } = useTheme()
  const [filter, setFilter] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)

  const filtered = useMemo(() => {
    if (!filter) return commands
    const results: { entry: CommandPaletteEntry; score: number }[] = []
    for (const entry of commands) {
      const score = fuzzyMatch(filter, entry.title)
      if (score !== null) results.push({ entry, score })
    }
    results.sort((a, b) => b.score - a.score)
    return results.map((r) => r.entry)
  }, [commands, filter])

  const handleSelect = useCallback(() => {
    const item = filtered[activeIndex]
    if (item) {
      onSelect(item.id)
    }
  }, [filtered, activeIndex, onSelect])

  useKeyboard((key) => {
    if (key.name === "escape") {
      key.preventDefault()
      onClose()
    } else if (key.name === "return") {
      key.preventDefault()
      handleSelect()
    } else if (key.name === "up") {
      key.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (key.name === "down") {
      key.preventDefault()
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
    }
  })

  return (
    <box
      position="absolute"
      marginLeft="20%"
      marginRight="20%"
      marginTop="25%"
      maxHeight="50%"
      flexDirection="column"
      backgroundColor={theme.backgroundPanel}
      border
      borderColor={theme.border}
    >
      {/* Filter row */}
      <box flexDirection="row" paddingLeft={1} paddingRight={1} height={1}>
        <text content=":" fg={theme.accent} />
        <input
          focused
          placeholder="Filter commands..."
          onInput={(value: string) => {
            setFilter(value)
            setActiveIndex(0)
          }}
          backgroundColor="transparent"
          focusedBackgroundColor="transparent"
          textColor={theme.text}
          placeholderColor={theme.textMuted}
          cursorColor={theme.accent}
          style={{ flexGrow: 1 }}
        />
        <text content={` ${filtered.length}`} fg={theme.textMuted} />
      </box>

      {/* Separator */}
      <box height={1} width="100%" backgroundColor={theme.border} />

      {/* Command list */}
      <scrollbox focused={false} style={{ flexGrow: 1 }}>
        {filtered.map((entry, i) => (
          <box
            key={entry.id}
            flexDirection="row"
            paddingLeft={1}
            paddingRight={1}
            height={1}
            backgroundColor={i === activeIndex ? theme.backgroundElement : undefined}
          >
            <text content={entry.title} fg={theme.text} style={{ flexGrow: 1 }} />
            {entry.hotkey && <text content={entry.hotkey} fg={theme.textMuted} />}
            {entry.category && <text content={` ${entry.category}`} fg={theme.textMuted} />}
          </box>
        ))}
      </scrollbox>
    </box>
  )
}
