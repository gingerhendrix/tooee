import { useCallback, useMemo, useRef, useState } from "react"
import { createElement } from "react"
import { useCommandContext, useCommand, useMode } from "@tooee/commands"
import type { Mode } from "@tooee/commands"
import { useOverlay } from "@tooee/overlays"
import type { CommandPaletteEntry } from "@tooee/renderers"
import { CommandPaletteOverlay } from "./CommandPaletteOverlay.tsx"

const DEFAULT_MODES: Mode[] = ["command", "cursor"]
const OVERLAY_ID = "command-palette"

export interface CommandPaletteState {
  isOpen: boolean
  open: () => void
  close: () => void
  entries: CommandPaletteEntry[]
}

export function useCommandPalette(): CommandPaletteState {
  const { commands } = useCommandContext()
  const mode = useMode()
  const overlay = useOverlay()
  const [isOpen, setIsOpen] = useState(false)
  const launchModeRef = useRef<Mode>(mode)

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

  const close = useCallback(() => {
    setIsOpen(false)
    overlay.hide(OVERLAY_ID)
  }, [overlay])

  const open = useCallback(() => {
    launchModeRef.current = mode
    setIsOpen(true)
    overlay.open(
      OVERLAY_ID,
      ({ close }) =>
        createElement(CommandPaletteOverlay, {
          launchMode: mode,
          close: () => close(),
        }),
      null,
      { mode: "insert", dismissOnEscape: true },
    )
  }, [overlay, mode])

  useCommand({
    id: "command-palette",
    title: "Command Palette",
    hotkey: ":",
    modes: ["command"],
    handler: open,
  })

  return { isOpen, open, close, entries }
}
