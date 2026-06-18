import { useState, useMemo, useCallback } from "react"
import { useCommand } from "@tooee/commands"
import { useTheme, CloseButton } from "@tooee/themes"
import { fuzzyMatch } from "@tooee/fuzzy"

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

  const moveUp = useCallback(() => {
    setActiveIndex((i) => Math.max(0, i - 1))
  }, [])

  const moveDown = useCallback(() => {
    setActiveIndex((i) => Math.min(filtered.length - 1, i + 1))
  }, [filtered.length])

  useCommand({
    id: "command-palette:close",
    title: "Close command palette",
    hotkey: "Escape",
    modes: ["insert", "cursor"],
    hidden: true,
    handler: onClose,
  })
  useCommand({
    id: "command-palette:select",
    title: "Run selected command",
    hotkey: "Enter",
    modes: ["insert", "cursor"],
    hidden: true,
    handler: handleSelect,
  })
  useCommand({
    id: "command-palette:move-up",
    title: "Move up",
    hotkey: "up",
    modes: ["insert", "cursor"],
    hidden: true,
    handler: moveUp,
  })
  useCommand({
    id: "command-palette:move-down",
    title: "Move down",
    hotkey: "down",
    modes: ["insert", "cursor"],
    hidden: true,
    handler: moveDown,
  })

  return (
    <box
      position="absolute"
      left="20%"
      right="20%"
      top={2}
      maxHeight="60%"
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
          onSubmit={handleSelect}
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
        <CloseButton onClose={onClose} />
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
