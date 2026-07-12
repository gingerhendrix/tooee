import type { DecorationLayer, RowDecoration } from "@tooee/renderers";
import type { ResolvedTheme } from "@tooee/themes";
import { DocumentDecorationPriorities } from "./types.js";

const SEARCH_SIGN = "●";
const CURSOR_SIGN = "▸";

/** A decoration layer backed by an explicit row → decoration map. */
const rowLayer = function rowLayer(
  priority: number,
  rows: Map<number, Omit<RowDecoration, "row">>,
): DecorationLayer {
  return {
    *forVisibleRows(from: number, to: number): Generator<RowDecoration> {
      for (let row = from; row <= to; row += 1) {
        const decoration = rows.get(row);
        if (decoration) {
          yield { row, ...decoration };
        }
      }
    },
    priority,
  };
};

const singleRowLayer = function singleRowLayer(
  priority: number,
  row: number,
  decoration: Omit<RowDecoration, "row">,
): DecorationLayer {
  return rowLayer(priority, new Map([[row, decoration]]));
};

export interface InteractionDecorationInput {
  cursor: number | null;
  selection: { start: number; end: number } | null;
  toggledIndices: ReadonlySet<number>;
  matchingLines: readonly number[];
  currentMatchIndex: number;
  theme: ResolvedTheme;
}

/**
 * The interaction layers every row document shares: search matches, toggled
 * rows, the active range selection, the current search match, and the cursor.
 * Returned in ascending priority; the renderer sorts, so order is informative.
 */
export const buildInteractionDecorations = function buildInteractionDecorations({
  cursor,
  selection,
  toggledIndices,
  matchingLines,
  currentMatchIndex,
  theme,
}: InteractionDecorationInput): DecorationLayer[] {
  const layers: DecorationLayer[] = [];

  if (matchingLines.length > 0) {
    const rows = new Map<number, Omit<RowDecoration, "row">>();
    for (const row of matchingLines) {
      rows.set(row, {
        background: theme.warning,
        sign: { fg: theme.warning, text: SEARCH_SIGN },
      });
    }
    layers.push(rowLayer(DocumentDecorationPriorities.SEARCH_MATCH, rows));
  }

  if (toggledIndices.size > 0) {
    const rows = new Map<number, Omit<RowDecoration, "row">>();
    for (const row of toggledIndices) {
      rows.set(row, { background: theme.backgroundPanel });
    }
    layers.push(rowLayer(DocumentDecorationPriorities.TOGGLED, rows));
  }

  if (selection) {
    const rows = new Map<number, Omit<RowDecoration, "row">>();
    for (let row = selection.start; row <= selection.end; row += 1) {
      rows.set(row, { background: theme.selection });
    }
    layers.push(rowLayer(DocumentDecorationPriorities.SELECTION, rows));
  }

  const currentMatch = matchingLines[currentMatchIndex];
  if (currentMatch !== null && currentMatch !== undefined) {
    layers.push(
      singleRowLayer(DocumentDecorationPriorities.CURRENT_MATCH, currentMatch, {
        background: theme.primary,
        sign: { fg: theme.primary, text: SEARCH_SIGN },
      }),
    );
  }

  if (cursor !== null) {
    layers.push(
      singleRowLayer(DocumentDecorationPriorities.CURSOR, cursor, {
        background: theme.cursorLine,
        sign: { fg: theme.primary, text: CURSOR_SIGN },
      }),
    );
  }

  return layers;
};
