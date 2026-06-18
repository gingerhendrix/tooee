import { useState, useCallback } from "react"
import { useKeyboard, useTerminalDimensions } from "@opentui/react"
import { useTheme } from "@tooee/themes"

export interface ContextMenuEntry {
  id: string
  title: string
  hotkey?: string
}

interface ContextMenuProps {
  entries: ContextMenuEntry[]
  /** Anchor coordinates (screen space) — usually the click position. */
  x: number
  y: number
  onSelect: (id: string) => void
  onClose: () => void
}

const MIN_WIDTH = 16
const HPAD = 2 // 1 cell padding each side
const BORDER = 2

/**
 * A positioned, keyboard-navigable mini action menu shown on right-click.
 *
 * Renders a full-screen transparent backdrop (click-outside dismisses) and a
 * bordered panel anchored near the cursor, clamped to stay on screen. Mouse is
 * additive: j/k + arrows move, Enter invokes, Escape closes (handled by the
 * overlay layer), click selects.
 */
export function ContextMenu({ entries, x, y, onSelect, onClose }: ContextMenuProps) {
  const { theme } = useTheme()
  const { width: termWidth, height: termHeight } = useTerminalDimensions()
  const [activeIndex, setActiveIndex] = useState(0)

  const select = useCallback(
    (index: number) => {
      const entry = entries[index]
      if (entry) onSelect(entry.id)
    },
    [entries, onSelect],
  )

  useKeyboard((key) => {
    if (key.name === "up" || key.raw === "k") {
      key.preventDefault()
      setActiveIndex((i) => Math.max(0, i - 1))
    } else if (key.name === "down" || key.raw === "j") {
      key.preventDefault()
      setActiveIndex((i) => Math.min(entries.length - 1, i + 1))
    } else if (key.name === "return") {
      key.preventDefault()
      select(activeIndex)
    }
    // Escape is handled by the overlay layer (dismissOnEscape).
  })

  // Size the panel from its contents.
  const longest = entries.reduce((max, e) => {
    const w = e.title.length + (e.hotkey ? e.hotkey.length + 2 : 0)
    return Math.max(max, w)
  }, 0)
  const innerWidth = Math.max(MIN_WIDTH, longest)
  const panelWidth = innerWidth + HPAD + BORDER
  const panelHeight = Math.max(1, entries.length) + BORDER

  // Clamp on-screen: flip left/up when the anchor is near the right/bottom edge.
  let left = x
  if (left + panelWidth > termWidth) left = Math.max(0, termWidth - panelWidth)
  let top = y
  if (top + panelHeight > termHeight) top = Math.max(0, termHeight - panelHeight)

  return (
    <box position="absolute" left={0} top={0} width={termWidth} height={termHeight}>
      {/* Backdrop: click outside the menu dismisses it. */}
      <box
        position="absolute"
        left={0}
        top={0}
        width={termWidth}
        height={termHeight}
        backgroundColor="transparent"
        onMouseDown={(event) => {
          event.preventDefault()
          onClose()
        }}
      />
      <box
        position="absolute"
        left={left}
        top={top}
        width={panelWidth}
        flexDirection="column"
        backgroundColor={theme.backgroundPanel}
        border
        borderColor={theme.borderActive}
      >
        {entries.length === 0 ? (
          <box height={1} paddingLeft={1} paddingRight={1}>
            <text content="No actions" fg={theme.textMuted} />
          </box>
        ) : (
          entries.map((entry, i) => (
            <box
              key={entry.id}
              flexDirection="row"
              height={1}
              paddingLeft={1}
              paddingRight={1}
              backgroundColor={i === activeIndex ? theme.backgroundElement : undefined}
              onMouseDown={(event) => {
                if (event.button !== 0) return
                event.preventDefault()
                event.stopPropagation()
                onSelect(entry.id)
              }}
            >
              <text
                content={entry.title}
                fg={i === activeIndex ? theme.primary : theme.text}
                style={{ flexGrow: 1 }}
              />
              {entry.hotkey && <text content={` ${entry.hotkey}`} fg={theme.textMuted} />}
            </box>
          ))
        )}
      </box>
    </box>
  )
}
