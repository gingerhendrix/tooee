import { createElement, useMemo } from "react"
import type { ReactNode } from "react"
import type { Command, Mode } from "@tooee/commands"
import { CommandPalette } from "@tooee/renderers"

const DEFAULT_MODES: Mode[] = ["cursor"]

export function CommandPaletteOverlay({
  commands,
  invoke,
  launchMode,
  close,
}: {
  commands: Command[]
  invoke: (id: string) => void
  launchMode: Mode
  close: () => void
}): ReactNode {
  const entries = useMemo(
    () =>
      commands
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
        })),
    [commands, launchMode],
  )

  return createElement(CommandPalette, {
    commands: entries,
    onSelect: (id: string) => {
      close()
      invoke(id)
    },
    onClose: close,
  })
}
