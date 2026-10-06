import { useTerminalDimensions } from "@opentui/react";
import { useCommand } from "@tooee/commands";
import type { FlatBlock } from "@tooee/renderers";
import type { DocumentController, NavigationState } from "@tooee/shell";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { closedFoldsHiding } from "../folds/fold-model.js";
import type { FoldState } from "../folds/use-folds.js";
import { markdownOutline, outlineIndexAt } from "./markdown-outline.js";
import type { OutlineEntry } from "./markdown-outline.js";

/** Outline width in columns, border included. */
const OUTLINE_WIDTH = 32;

/** The outline never takes more than this share of the terminal width. */
const OUTLINE_MAX_SHARE = 0.4;

/** Below this terminal width the outline is not shown. */
export const OUTLINE_MIN_TERMINAL_WIDTH = 60;

/**
 * Lines of the document kept above a heading after a jump. The heading lands
 * near the top of the view, with a little of the text before it for context.
 */
export const OUTLINE_JUMP_MARGIN = 3;

/** Columns for the outline at a terminal width, or 0 when the terminal is too narrow. */
export const outlineWidth = function outlineWidth(terminalWidth: number): number {
  if (terminalWidth < OUTLINE_MIN_TERMINAL_WIDTH) {
    return 0;
  }

  return Math.min(OUTLINE_WIDTH, Math.floor(terminalWidth * OUTLINE_MAX_SHARE));
};

/** State and actions of a document outline. */
export interface OutlineState {
  entries: readonly OutlineEntry[];
  /** Entry of the heading that contains the document cursor, or -1. */
  currentIndex: number;
  /** Entry the outline highlights as selected: the current heading unless the outline has focus. */
  selectedIndex: number;
  /** Full-array rows whose own heading fold is closed. */
  closedRows: ReadonlySet<number>;
  /** True when the outline is open and the terminal is wide enough to show it. */
  visible: boolean;
  /** True when the visible outline owns keyboard input. */
  focused: boolean;
  /** Outline width in columns, or 0 when the terminal is too narrow. */
  width: number;
  focus: () => void;
  focusContent: () => void;
  close: () => void;
  move: (delta: number) => void;
  select: (index: number) => void;
  /** Move the document cursor to an entry's heading and give focus back to the content. */
  jump: (index: number) => void;
}

interface UseOutlineOptions {
  blocks: readonly FlatBlock[];
  folds: FoldState<FlatBlock>;
  navigation: Pick<NavigationState, "cursor" | "setCursor">;
  /** Scrolls a jumped-to heading near the top of the document view. */
  revealRow: DocumentController<FlatBlock>["revealRow"];
  initialOpen?: boolean;
}

/**
 * Outline state for a Markdown document, and the root `g o` command that
 * opens, focuses and closes it. A jump to a heading inside closed folds opens
 * those folds, then moves the cursor once the new rows are in place. Every
 * jump scrolls the heading to near the top of the view.
 */
export const useMarkdownOutline = function useMarkdownOutline({
  blocks,
  folds,
  navigation,
  revealRow,
  initialOpen = false,
}: UseOutlineOptions): OutlineState {
  const entries = useMemo(() => markdownOutline(blocks), [blocks]);
  const { width: terminalWidth } = useTerminalDimensions();
  const width = outlineWidth(terminalWidth);
  const [open, setOpen] = useState(initialOpen);
  const [focusRequested, setFocusRequested] = useState(false);
  const [selected, setSelected] = useState(0);

  const { closedKeys, ranges, setClosedKeys, view } = folds;
  const { cursor, setCursor } = navigation;
  const visible = open && width > 0;

  const moveTo = useCallback(
    (index: number) => {
      setCursor(index);
      revealRow(index, { align: "start", margin: OUTLINE_JUMP_MARGIN });
    },
    [setCursor, revealRow]
  );

  const focused = visible && focusRequested;
  const sourceRow = cursor === null ? undefined : view.visibleToSource[cursor];
  const currentIndex = sourceRow === undefined ? -1 : outlineIndexAt(entries, sourceRow);
  const selectedIndex = focused ? Math.min(selected, entries.length - 1) : currentIndex;

  const closedRows = useMemo(
    () => new Set(ranges.filter((range) => closedKeys.has(range.key)).map((range) => range.start)),
    [ranges, closedKeys]
  );

  // A jump that opens folds waits for the new fold view, then moves the
  // cursor. This effect runs after the controller's own rows effect, so the
  // store already holds the new rows.
  const pendingRowRef = useRef<number | null>(null);
  useEffect(() => {
    const row = pendingRowRef.current;
    const index = row === null ? -1 : (view.sourceToVisible[row] ?? -1);

    if (index !== -1) {
      pendingRowRef.current = null;
      moveTo(index);
    }
  }, [view, moveTo]);

  const focus = () => {
    setSelected(Math.max(currentIndex, 0));
    setFocusRequested(true);
  };

  const focusContent = () => {
    setFocusRequested(false);
  };

  const close = () => {
    setOpen(false);
    setFocusRequested(false);
  };

  const select = (index: number) => {
    setSelected(Math.max(0, Math.min(index, entries.length - 1)));
  };

  const move = (delta: number) => {
    select(selectedIndex + delta);
  };

  const jump = (index: number) => {
    const entry = entries[index];
    setFocusRequested(false);

    if (entry === undefined) {
      return;
    }

    const hiding = closedFoldsHiding(ranges, closedKeys, entry.row);

    if (hiding.length === 0) {
      moveTo(view.sourceToVisible[entry.row] ?? 0);

      return;
    }

    const next = new Set(closedKeys);

    for (const key of hiding) {
      next.delete(key);
    }

    pendingRowRef.current = entry.row;
    setClosedKeys(next);
  };

  useCommand({
    category: "Outline",
    handler: (ctx) => {
      if (width === 0) {
        ctx.toast?.toast({ level: "info", message: "The outline needs a wider terminal" });

        return;
      }

      if (open && focused) {
        close();

        return;
      }

      setOpen(true);
      focus();
    },
    hotkey: "g o",
    id: "outline.toggle",
    modes: ["cursor"],
    title: "Toggle outline",
  });

  return {
    close,
    closedRows,
    currentIndex,
    entries,
    focus,
    focusContent,
    focused,
    jump,
    move,
    select,
    selectedIndex,
    visible,
    width,
  };
};
