import { createElement, useMemo } from "react"
import type { ReactNode } from "react"
import { useCommandContext } from "@tooee/commands"
import type { Mode } from "@tooee/commands"
import { CommandPalette } from "@tooee/renderers"

const DEFAULT_MODES: Mode[] = ["cursor"]

export function CommandPaletteOverlay({
  launchMode,
  close,
}: {
  launchMode: Mode
  close: () => void
}): ReactNode {
  const { commands, invoke } = useCommandContext()

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
