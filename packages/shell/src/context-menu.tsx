import { useCallback, createElement } from "react"
import { useOverlay } from "@tooee/overlays"
import type { OverlayCloseReason } from "@tooee/overlays"
import { ContextMenu, type ContextMenuEntry } from "@tooee/renderers"

const OVERLAY_ID = "context-menu"

export interface ContextMenuController {
  /** Open a context menu at screen coordinates with the given entries. */
  open: (
    x: number,
    y: number,
    entries: ContextMenuEntry[],
    onSelect: (id: string) => void,
  ) => void
  /** Close the context menu if open. */
  close: () => void
}

/**
 * Opens a right-click context menu as an overlay positioned near the cursor.
 *
 * The menu is keyboard-navigable and dismisses on Escape, click-outside, or
 * selection. Restores the previous mode on close (handled by the overlay layer).
 */
export function useContextMenu(): ContextMenuController {
  const overlay = useOverlay()

  const open = useCallback(
    (x: number, y: number, entries: ContextMenuEntry[], onSelect: (id: string) => void) => {
      overlay.open(
        OVERLAY_ID,
        ({ close }: { close: (reason?: OverlayCloseReason) => void }) =>
          createElement(ContextMenu, {
            entries,
            x,
            y,
            onSelect: (id: string) => {
              close()
              onSelect(id)
            },
            onClose: () => close(),
          }),
        null,
        { mode: "insert", dismissOnEscape: true },
      )
    },
    [overlay],
  )

  const close = useCallback(() => {
    overlay.hide(OVERLAY_ID)
  }, [overlay])

  return { open, close }
}
