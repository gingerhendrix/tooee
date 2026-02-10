import { useState, useMemo, useCallback } from "react"
import { useKeyboard } from "@opentui/react"
import { useTheme } from "./theme.tsx"

export interface ThemePickerEntry {
  id: string
  title: string
}

interface ThemePickerProps {
  entries: ThemePickerEntry[]
  currentTheme: string
  onSelect: (name: string) => void
  onClose: () => void
  onNavigate: (name: string) => void
}

function fuzzyMatch(query: string, text: string): number | null {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()

  let qi = 0
  let score = 0
  let lastMatchIndex = -2

  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      if (ti === 0) score += 3
      else if (" -./".includes(lowerText[ti - 1]!)) score += 2
      else if (ti === lastMatchIndex + 1) score += 1

      lastMatchIndex = ti
      qi++
    }
  }

  return qi === lowerQuery.length ? score : null
}

export function ThemePicker({
  entries,
  currentTheme,
  onSelect,
  onClose,
  onNavigate,
}: ThemePickerProps) {
  const { theme } = useTheme()
  const [filter, setFilter] = useState("")
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = entries.findIndex((e) => e.id === currentTheme)
    return idx >= 0 ? idx : 0
  })

  const filtered = useMemo(() => {
    if (!filter) return entries
    const results: { entry: ThemePickerEntry; score: number }[] = []
    for (const entry of entries) {
      const score = fuzzyMatch(filter, entry.title)
      if (score !== null) results.push({ entry, score })
    }
    results.sort((a, b) => b.score - a.score)
    return results.map((r) => r.entry)
  }, [entries, filter])

  const handleSelect = useCallback(() => {
    const item = filtered[activeIndex]
    if (item) {
      onSelect(item.id)
    }
  }, [filtered, activeIndex, onSelect])

  const navigateTo = useCallback(
    (index: number) => {
      setActiveIndex(index)
      const item = filtered[index]
      if (item) {
        onNavigate(item.id)
      }
    },
    [filtered, onNavigate],
  )

  useKeyboard((key) => {
    if (key.name === "escape") {
      key.preventDefault()
      onClose()
    } else if (key.name === "return") {
      key.preventDefault()
      handleSelect()
    } else if (key.name === "up") {
      key.preventDefault()
      navigateTo(Math.max(0, activeIndex - 1))
    } else if (key.name === "down") {
      key.preventDefault()
      navigateTo(Math.min(filtered.length - 1, activeIndex + 1))
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
        <text content="🎨 " fg={theme.accent} />
        <input
          focused
          placeholder="Filter themes..."
          onInput={(value: string) => {
            setFilter(value)
            setActiveIndex(0)
            // Preview first match
            if (!value) {
              if (entries.length > 0) onNavigate(entries[0]!.id)
            } else {
              const results: { entry: ThemePickerEntry; score: number }[] = []
              for (const entry of entries) {
                const score = fuzzyMatch(value, entry.title)
                if (score !== null) results.push({ entry, score })
              }
              results.sort((a, b) => b.score - a.score)
              if (results.length > 0) onNavigate(results[0]!.entry.id)
            }
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

      {/* Theme list */}
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
          </box>
        ))}
      </scrollbox>
    </box>
  )
}
