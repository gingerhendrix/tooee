import { useCallback, useRef, type ReactNode } from "react"
import { createElement } from "react"
import { useCommand, useCommandContext, useMode } from "@tooee/commands"
import { useOverlay } from "@tooee/overlays"
import type { OverlayCloseReason } from "@tooee/overlays"
import { CommandPaletteOverlay } from "./CommandPaletteOverlay.js"

const OVERLAY_ID = "command-palette"

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const mode = useMode()
  const overlay = useOverlay()
  // Read the host command context lazily at open time. The registry is mutated
  // by `useCommand` effects without re-rendering this provider, so a render-time
  // snapshot of `commands` would be stale/empty. Capture it when the palette is
  // actually opened instead.
  const commandContext = useCommandContext()
  const commandContextRef = useRef(commandContext)
  commandContextRef.current = commandContext

  const open = useCallback(() => {
    const { commands, invoke } = commandContextRef.current
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
  }, [overlay, mode])

  useCommand({
    id: "command-palette",
    title: "Command Palette",
    hotkey: ":",
    modes: ["cursor", "select"],
    handler: open,
  })

  return <>{children}</>
}
