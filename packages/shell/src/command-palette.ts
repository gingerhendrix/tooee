import { useState, useMemo, useCallback, useRef } from "react"
import { useCommandContext, useCommand, useSetMode, useMode } from "@tooee/commands"
import type { Mode } from "@tooee/commands"
import type { CommandPaletteEntry } from "@tooee/react"

const DEFAULT_MODES: Mode[] = ["command", "cursor"]

export interface CommandPaletteState {
  isOpen: boolean
  open: () => void
  close: () => void
  entries: CommandPaletteEntry[]
}

export function useCommandPalette(): CommandPaletteState {
  const [isOpen, setIsOpen] = useState(false)
  const { commands } = useCommandContext()
  const setMode = useSetMode()
  const mode = useMode()
  const launchModeRef = useRef<Mode>("command")

  const open = useCallback(() => {
    launchModeRef.current = mode
    setIsOpen(true)
    setMode("insert")
  }, [setMode, mode])

  const close = useCallback(() => {
    setIsOpen(false)
    setMode("command")
  }, [setMode])

  useCommand({
    id: "command-palette",
    title: "Command Palette",
    hotkey: ":",
    modes: ["command"],
    handler: open,
  })

  const launchMode = launchModeRef.current
  const entries = useMemo(() => {
    return commands
      .filter((cmd) => !cmd.hidden)
      .filter((cmd) => {
        const cmdModes = cmd.modes ?? DEFAULT_MODES
        return cmdModes.includes(launchMode)
      })
      .map((cmd) => ({
        id: cmd.id,
        title: cmd.title,
        hotkey: cmd.defaultHotkey,
        category: cmd.category,
        icon: cmd.icon,
      }))
  }, [commands, launchMode])

  return { isOpen, open, close, entries }
}
