import type { MouseEvent, ScrollBoxRenderable } from "@opentui/core";
import { useActions } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { Panel, PanelGroup } from "@tooee/panels";
import { useTheme } from "@tooee/themes";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import type { OutlineEntry } from "./markdown-outline.js";
import type { OutlineState } from "./use-outline.js";

const OUTLINE_PANEL_ID = "outline";
const INDENT = "  ";
/** Columns the panel border and the list padding take from the panel width. */
const OUTLINE_CHROME_WIDTH = 4;

const entryId = (entry: OutlineEntry): string => `outline-entry-${entry.row}`;

/** One outline line: indent, current-heading marker and text, cut to `width` columns. */
export const outlineLabel = function outlineLabel(
  entry: OutlineEntry,
  current: boolean,
  closed: boolean,
  width: number
): string {
  const suffix = closed ? " ⋯" : "";
  const label = `${INDENT.repeat(entry.level)}${current ? "▸ " : "  "}${entry.text}`;
  const room = Math.max(1, width - suffix.length);
  const cut = label.length > room ? `${label.slice(0, Math.max(0, room - 1))}…` : label;
  return `${cut}${suffix}`;
};

/**
 * The panel-owned outline commands. They register on the outline panel's
 * surface, so they only dispatch while the outline has focus, and they shadow
 * the root commands on the same keys. `g o` closes the outline here, because
 * the panel's `g g` holds the `g` chord.
 */
const OutlineCommands = function OutlineCommands({ outline }: { outline: OutlineState }): null {
  const next = (): void => {
    outline.move(1);
  };
  const previous = (): void => {
    outline.move(-1);
  };
  const first = (): void => {
    outline.select(0);
  };
  const last = (): void => {
    outline.select(outline.entries.length - 1);
  };
  const jump = (): void => {
    outline.jump(outline.selectedIndex);
  };
  const commands: [hotkey: string, id: string, title: string, run: () => void][] = [
    ["j", "outline.down", "Next heading", next],
    ["down", "outline.down-arrow", "Next heading", next],
    ["k", "outline.up", "Previous heading", previous],
    ["up", "outline.up-arrow", "Previous heading", previous],
    ["g g", "outline.first", "First heading", first],
    ["shift+g", "outline.last", "Last heading", last],
    ["enter", "outline.jump", "Jump to heading", jump],
    ["escape", "outline.focus-content", "Return to document", outline.focusContent],
    ["g o", "outline.close", "Close outline", outline.close],
  ];
  useActions(
    commands.map(([hotkey, id, title, run]): ActionDefinition => ({
      category: "Outline",
      handler: run,
      hotkey,
      id,
      modes: ["cursor"],
      title,
    }))
  );
  return null;
};

const OutlineList = function OutlineList({ outline }: { outline: OutlineState }): ReactNode {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);
  const textWidth = Math.max(1, outline.width - OUTLINE_CHROME_WIDTH);
  const selected = outline.entries[outline.selectedIndex];

  useEffect(() => {
    if (selected !== undefined) {
      scrollRef.current?.scrollChildIntoView(entryId(selected));
    }
  }, [selected]);

  if (outline.entries.length === 0) {
    return <text content="No headings" fg={theme.textMuted} paddingLeft={1} />;
  }

  return (
    <scrollbox
      ref={scrollRef}
      style={{ flexGrow: 1 }}
      focused={false}
      verticalScrollbarOptions={{ visible: false }}
    >
      {outline.entries.map((entry, index): ReactNode => {
        const current = index === outline.currentIndex;
        const highlighted = outline.focused && index === outline.selectedIndex;
        return (
          <box
            key={entry.row}
            id={entryId(entry)}
            paddingLeft={1}
            paddingRight={1}
            backgroundColor={highlighted ? theme.cursorLine : undefined}
            onMouseDown={(event: MouseEvent) => {
              event.stopPropagation();
              outline.jump(index);
            }}
          >
            <text
              content={outlineLabel(entry, current, outline.closedRows.has(entry.row), textWidth)}
              fg={current ? theme.accent : theme.text}
            />
          </box>
        );
      })}
    </scrollbox>
  );
};

/**
 * The outline as a side panel. A controlled group with one panel: the panel
 * is active only while the outline has focus, so the document keeps the root
 * surface the rest of the time. Built-in Tab switching is off, so Tab keeps
 * its multi-select meaning in the document.
 */
export const OutlinePanel = function OutlinePanel({
  outline,
}: {
  outline: OutlineState;
}): ReactNode {
  if (!outline.visible) {
    return null;
  }
  // The only panel asks for activation on a mouse-down inside it.
  const handleActivePanelChange = (): void => {
    outline.focus();
  };
  return (
    <PanelGroup
      activePanelId={outline.focused ? OUTLINE_PANEL_ID : null}
      onActivePanelChange={handleActivePanelChange}
      switchKeys={null}
    >
      <Panel id={OUTLINE_PANEL_ID} title="Outline" style={{ flexShrink: 0, width: outline.width }}>
        <OutlineCommands outline={outline} />
        <OutlineList outline={outline} />
      </Panel>
    </PanelGroup>
  );
};
