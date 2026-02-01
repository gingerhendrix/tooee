import { useState, useMemo } from "react"
import { useCommandContext, useCommand } from "@tooee/commands"
import type { CommandPaletteEntry } from "@tooee/react"

export interface CommandPaletteState {
  isOpen: boolean
  open: () => void
  close: () => void
  entries: CommandPaletteEntry[]
}

export function useCommandPalette(): CommandPaletteState {
  const [isOpen, setIsOpen] = useState(false)
  const { commands } = useCommandContext()

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  useCommand({
    id: "command-palette",
    title: "Command Palette",
    hotkey: ":",
    modes: ["command"],
    handler: open,
  })

  const entries = useMemo(() => {
    return commands
      .filter((cmd) => !cmd.hidden)
      .map((cmd) => ({
        id: cmd.id,
        title: cmd.title,
        hotkey: cmd.defaultHotkey,
        category: cmd.category,
        icon: cmd.icon,
      }))
  }, [commands])

  return { isOpen, open, close, entries }
}
