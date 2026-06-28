import { useCallback, type ReactNode } from "react"
import { createElement } from "react"
import { useCommand, useCommandContext, useMode } from "@tooee/commands"
import { useOverlay } from "@tooee/overlays"
import type { OverlayCloseReason } from "@tooee/overlays"
import { CommandPaletteOverlay } from "./CommandPaletteOverlay.js"

const OVERLAY_ID = "command-palette"

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const mode = useMode()
  const overlay = useOverlay()
  const { commands, invoke } = useCommandContext()

  const open = useCallback(() => {
    overlay.open(
      OVERLAY_ID,
      ({ close }: { close: (reason?: OverlayCloseReason) => void }) =>
        createElement(CommandPaletteOverlay, {
          commands,
          invoke,
          launchMode: mode,
          close: () => close(),
        }),
      null,
      { ownCommands: true, role: "modal", surfaceMode: "insert" },
    )
  }, [overlay, commands, invoke, mode])

  useCommand({
    id: "command-palette",
    title: "Command Palette",
    hotkey: ":",
    modes: ["cursor", "select"],
    handler: open,
  })

  return <>{children}</>
}
