import { useState, useMemo, useCallback, useRef } from "react"
import { createElement } from "react"
import { useCommandContext, useCommand, useSetMode, useMode } from "@tooee/commands"
import type { Mode } from "@tooee/commands"
import { CommandPalette, useOverlay } from "@tooee/react"
import type { CommandPaletteEntry } from "@tooee/react"

const DEFAULT_MODES: Mode[] = ["command", "cursor"]
const OVERLAY_ID = "command-palette"

export interface CommandPaletteState {
  isOpen: boolean
  open: () => void
  close: () => void
  entries: CommandPaletteEntry[]
}

export function useCommandPalette(): CommandPaletteState {
  const [isOpen, setIsOpen] = useState(false)
  const { commands, invoke } = useCommandContext()
  const setMode = useSetMode()
  const mode = useMode()
  const launchModeRef = useRef<Mode>("command")
  const overlay = useOverlay()

  const close = useCallback(() => {
    setIsOpen(false)
    overlay.hide(OVERLAY_ID)
    setMode("command")
  }, [setMode, overlay])

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

  const open = useCallback(() => {
    launchModeRef.current = mode
    setIsOpen(true)
    setMode("insert")
    overlay.show(
      OVERLAY_ID,
      createElement(CommandPalette, {
        commands: entries,
        onSelect: (id: string) => {
          setIsOpen(false)
          overlay.hide(OVERLAY_ID)
          setMode("command")
          invoke(id)
        },
        onClose: () => {
          setIsOpen(false)
          overlay.hide(OVERLAY_ID)
          setMode("command")
        },
      }),
    )
  }, [setMode, mode, overlay, entries, invoke])

  useCommand({
    id: "command-palette",
    title: "Command Palette",
    hotkey: ":",
    modes: ["command"],
    handler: open,
  })

  return { isOpen, open, close, entries }
}
