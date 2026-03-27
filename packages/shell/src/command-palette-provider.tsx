import { useCallback, useRef, type ReactNode } from "react"
import { createElement } from "react"
import { useCommand, useMode } from "@tooee/commands"
import type { Mode } from "@tooee/commands"
import { useOverlay } from "@tooee/overlays"
import type { OverlayCloseReason } from "@tooee/overlays"
import { CommandPaletteOverlay } from "./CommandPaletteOverlay.js"

const OVERLAY_ID = "command-palette"

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const mode = useMode()
  const overlay = useOverlay()
  const launchModeRef = useRef<Mode>(mode)

  const open = useCallback(() => {
    launchModeRef.current = mode
    overlay.open(
      OVERLAY_ID,
      ({ close }: { close: (reason?: OverlayCloseReason) => void }) =>
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
    modes: ["cursor", "select"],
    handler: open,
  })

  return <>{children}</>
}
