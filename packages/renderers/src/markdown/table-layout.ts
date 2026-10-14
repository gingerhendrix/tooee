import { bold as boldChunk } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import type { ResolvedTheme } from "@tooee/themes";
import type { Tokens } from "marked";

import { inlineTokensToChunks } from "./chunks.js";
import { getPlainText } from "./plain-text.js";

/** Border columns around a table row: one before each cell and one after the last. */
export const tableBorderColumns = function tableBorderColumns(columnCount: number): number {
  return columnCount + 1;
};

/**
 * Styled chunks for one table cell. Header cells are bold. A cell with no
 * inline chunks falls back to its plain text.
 */
export const tableCellChunks = function tableCellChunks(
  cell: Tokens.TableCell,
  theme: ResolvedTheme,
  header: boolean
): TextChunk[] {
  const chunks = inlineTokensToChunks(cell.tokens, theme);

  if (header) {
    return chunks.length > 0
      ? chunks.map((item) => boldChunk(item))
      : [boldChunk(getPlainText(cell.tokens).trim())];
  }

  return chunks.length > 0 ? chunks : [{ __isChunk: true, text: getPlainText(cell.tokens) }];
};

/** Cells of row `index` of a table. Row `0` is the header. */
export const tableRowCells = function tableRowCells(
  table: Tokens.Table,
  index: number
): readonly Tokens.TableCell[] {
  return index === 0 ? table.header : (table.rows[index - 1] ?? []);
};

/** Display width of the widest line of a cell's chunks. Never less than 1. */
export const chunksDisplayWidth = function chunksDisplayWidth(
  chunks: readonly TextChunk[]
): number {
  const lines = chunks
    .map((item) => item.text)
    .join("")
    .split("\n");

  return Math.max(1, ...lines.map((line) => Bun.stringWidth(line)));
};

/**
 * Fit natural column widths into `available` cells. When they do not fit,
 * narrow columns keep their width and the widest columns share what is left,
 * so the widest ones wrap first. Every column keeps at least one cell.
 */
export const fitTableColumnWidths = function fitTableColumnWidths(
  natural: readonly number[],
  available: number
): number[] {
  const total = natural.reduce((sum, width) => sum + width, 0);

  if (total <= available) {
    return [...natural];
  }

  const budget = Math.max(available, natural.length);
  const ascending = natural.toSorted((a, b) => a - b);
  let remaining = budget;
  let cap = 1;

  for (const [position, width] of ascending.entries()) {
    const share = Math.floor(remaining / (ascending.length - position));

    if (width > share) {
      cap = Math.max(1, share);
      break;
    }

    remaining -= width;
  }

  const widths = natural.map((width) => Math.min(width, cap));
  let spare = budget - widths.reduce((sum, width) => sum + width, 0);

  for (const [column, width] of natural.entries()) {
    if (spare <= 0) {
      break;
    }

    if (width > cap) {
      widths[column] = cap + 1;
      spare -= 1;
    }
  }

  return widths;
};

interface CachedWidths {
  available: number;
  widths: number[];
}

/**
 * Column widths per table token. Every row of a table renders on its own, so
 * the cache makes all rows share one result and measures each cell once.
 */
const widthCache = new WeakMap<Tokens.Table, CachedWidths>();

/**
 * Column widths, without borders, for every row of `table`. The widths depend
 * only on the cell text and `available`, so theme changes reuse the cache.
 */
export const tableColumnWidths = function tableColumnWidths(
  table: Tokens.Table,
  available: number,
  theme: ResolvedTheme
): number[] {
  const cached = widthCache.get(table);

  if (cached?.available === available) {
    return cached.widths;
  }

  const natural = table.header.map((_cell, column) => {
    let widest = 1;

    for (let index = 0; index <= table.rows.length; index += 1) {
      const cell = tableRowCells(table, index)[column];

      if (cell !== undefined) {
        widest = Math.max(widest, chunksDisplayWidth(tableCellChunks(cell, theme, index === 0)));
      }
    }

    return widest;
  });

  const widths = fitTableColumnWidths(natural, available);
  widthCache.set(table, { available, widths });

  return widths;
};

/** A horizontal border line such as `┌──┬──┐` for the given column widths. */
export const tableBorderLine = function tableBorderLine(
  widths: readonly number[],
  left: string,
  middle: string,
  right: string
): string {
  return left + widths.map((width) => "─".repeat(width)).join(middle) + right;
};
