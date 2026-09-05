import { useState, useCallback } from "react";
import { useTerminalDimensions } from "@opentui/react";
import { useCommand } from "@tooee/commands";
import { useTheme } from "@tooee/themes";

export interface ContextMenuEntry {
  id: string;
  title: string;
  hotkey?: string;
}

interface ContextMenuProps {
  entries: ContextMenuEntry[];
  /** Anchor coordinates (screen space) — usually the click position. */
  x: number;
  y: number;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const MIN_WIDTH = 16;
const HORIZONTAL_PADDING = 2;
const BORDER = 2;

/**
 * A positioned, keyboard-navigable mini action menu shown on right-click.
 *
 * Renders a full-screen transparent backdrop (click-outside dismisses) and a
 * bordered panel anchored near the cursor, clamped to stay on screen. Mouse is
 * additive: j/k + arrows move, Enter invokes, Escape closes (handled by the
 * overlay layer), click selects.
 */
export const ContextMenu = function ContextMenu({
  entries,
  x,
  y,
  onSelect,
  onClose,
}: ContextMenuProps): React.ReactNode {
  const { theme } = useTheme();
  const { width: termWidth, height: termHeight } = useTerminalDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const select = useCallback(
    (index: number) => {
      const entry = entries[index];
      if (entry !== undefined) {
        onSelect(entry.id);
      }
    },
    [entries, onSelect],
  );

  const moveUp = useCallback(() => {
    setActiveIndex((index) => Math.max(0, index - 1));
  }, []);
  const moveDown = useCallback(() => {
    setActiveIndex((index) => Math.min(entries.length - 1, index + 1));
  }, [entries.length]);
  const selectActive = useCallback(() => {
    select(activeIndex);
  }, [activeIndex, select]);

  useCommand({
    handler: moveUp,
    hidden: true,
    hotkey: "up",
    id: "context-menu:move-up",
    modes: ["insert", "cursor"],
    title: "Move up",
  });
  useCommand({
    handler: moveUp,
    hidden: true,
    hotkey: "k",
    id: "context-menu:move-up-vim",
    modes: ["insert", "cursor"],
    title: "Move up",
  });
  useCommand({
    handler: moveDown,
    hidden: true,
    hotkey: "down",
    id: "context-menu:move-down",
    modes: ["insert", "cursor"],
    title: "Move down",
  });
  useCommand({
    handler: moveDown,
    hidden: true,
    hotkey: "j",
    id: "context-menu:move-down-vim",
    modes: ["insert", "cursor"],
    title: "Move down",
  });
  useCommand({
    handler: selectActive,
    hidden: true,
    hotkey: "Enter",
    id: "context-menu:select",
    modes: ["insert", "cursor"],
    title: "Select action",
  });

  // Size the panel from its contents (terminal cell width, not code units,
  // so wide glyphs like CJK and emoji are counted correctly).
  let longest = 0;
  const entryCount = entries.length;
  for (let index = 0; index < entryCount; index += 1) {
    if (index in entries) {
      const entry = entries[index];
      const width =
        Bun.stringWidth(entry.title) +
        (entry.hotkey !== undefined && entry.hotkey !== "" ? Bun.stringWidth(entry.hotkey) + 2 : 0);
      longest = Math.max(longest, width);
    }
  }
  const innerWidth = Math.max(MIN_WIDTH, longest);
  const panelWidth = innerWidth + HORIZONTAL_PADDING + BORDER;
  const panelHeight = Math.max(1, entries.length) + BORDER;

  // Clamp on-screen: flip left/up when the anchor is near the right/bottom edge.
  let left = x;
  if (left + panelWidth > termWidth) {
    left = Math.max(0, termWidth - panelWidth);
  }
  let top = y;
  if (top + panelHeight > termHeight) {
    top = Math.max(0, termHeight - panelHeight);
  }

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
          event.preventDefault();
          onClose();
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
          entries.map(
            (entry, i): React.ReactNode => (
              <box
                key={entry.id}
                flexDirection="row"
                height={1}
                paddingLeft={1}
                paddingRight={1}
                backgroundColor={i === activeIndex ? theme.backgroundElement : undefined}
                onMouseDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }
                  event.preventDefault();
                  event.stopPropagation();
                  onSelect(entry.id);
                }}
              >
                <text
                  content={entry.title}
                  fg={i === activeIndex ? theme.primary : theme.text}
                  style={{ flexGrow: 1 }}
                />
                {(entry.hotkey?.length ?? 0) > 0 && (
                  <text content={` ${entry.hotkey}`} fg={theme.textMuted} />
                )}
              </box>
            ),
          )
        )}
      </box>
    </box>
  );
};
