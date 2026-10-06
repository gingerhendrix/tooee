import { TextBufferView } from "@opentui/core";
import type { Renderable } from "@opentui/core";

/*
 * OpenTUI 0.5.12 has no public cell hit test for `TextTableRenderable`. This module is the only
 * place that reads its private members, the `_layout` arrays and the `_cells` text views. It reads
 * the layout of the last render, which is the layout the user clicked on.
 * `test/text-table-internals.test.tsx` fails when OpenTUI renames or reshapes these members.
 * Replace this module when OpenTUI exposes a public hit test.
 */

interface TextTableInternals {
  readonly cellPaddingX: number;
  readonly cellPaddingY: number;
  readonly _layout: {
    readonly columnOffsets: readonly number[];
    readonly columnWidths: readonly number[];
    readonly rowHeights: readonly number[];
    readonly rowOffsets: readonly number[];
  };
  readonly _cells: readonly (readonly (
    | { readonly textBufferView: TextBufferView }
    | undefined
  )[])[];
}

/** Private `TextTableRenderable` members that the cell hit test reads. */
export const hasTextTableInternals = function hasTextTableInternals(
  table: Renderable
): table is Renderable & TextTableInternals {
  if (
    !("_layout" in table && "_cells" in table && "cellPaddingX" in table && "cellPaddingY" in table)
  ) {
    return false;
  }

  const { _layout: layout } = table;

  return (
    Array.isArray(table._cells) &&
    Number.isInteger(table.cellPaddingX) &&
    Number.isInteger(table.cellPaddingY) &&
    layout instanceof Object &&
    "columnOffsets" in layout &&
    "columnWidths" in layout &&
    "rowHeights" in layout &&
    "rowOffsets" in layout &&
    Array.isArray(layout.columnOffsets) &&
    Array.isArray(layout.columnWidths) &&
    Array.isArray(layout.rowHeights) &&
    Array.isArray(layout.rowOffsets)
  );
};

interface Span {
  index: number;
  /** Distance from the first cell of the span. */
  inside: number;
}

/**
 * Find the row or column that holds a local coordinate. Each offset marks the border or gap
 * before its span, so the span starts one cell later. This matches OpenTUI's own private
 * `getCellAtLocalPosition`.
 */
const spanAt = function spanAt(
  offsets: readonly number[],
  sizes: readonly number[],
  local: number
): Span | null {
  for (const [index, size] of sizes.entries()) {
    const inside = local - (offsets[index] ?? 0) - 1;

    if (inside >= 0 && inside < size) {
      return { index, inside };
    }
  }

  return null;
};

/** A pointer position inside one table cell, in the cell's own text coordinates. */
export interface TextTableCellHit {
  row: number;
  column: number;
  /** Logical line inside the cell text. */
  line: number;
  /** Display column inside that logical line. */
  offset: number;
}

/**
 * Map a screen position to a cell of a rendered text table and to a text position in that cell.
 * Wrapped cells map each visual line back to its logical line. Returns null for borders, padding,
 * and blank space after the text on a line.
 */
export const textTableCellAt = function textTableCellAt(
  table: Renderable,
  x: number,
  y: number
): TextTableCellHit | null {
  if (!hasTextTableInternals(table)) {
    return null;
  }

  const { columnOffsets, columnWidths, rowHeights, rowOffsets } = table._layout;
  const row = spanAt(rowOffsets, rowHeights, y - table.y);
  const column = spanAt(columnOffsets, columnWidths, x - table.x);

  if (row === null || column === null) {
    return null;
  }

  const view = table._cells[row.index]?.[column.index]?.textBufferView;

  if (!(view instanceof TextBufferView)) {
    return null;
  }

  const cellX = column.inside - table.cellPaddingX;
  const visualLine = row.inside - table.cellPaddingY;
  const { lineSources, lineStartCols, lineWidthCols } = view.lineInfo;
  const line = lineSources[visualLine];
  const start = lineStartCols[visualLine];
  const width = lineWidthCols[visualLine];

  if (line === undefined || start === undefined || width === undefined) {
    return null;
  }

  if (cellX < 0 || cellX >= width) {
    return null;
  }

  return { column: column.index, line, offset: start + cellX, row: row.index };
};
