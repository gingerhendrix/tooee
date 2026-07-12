import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "@tooee/themes";
import { useMemo, useRef } from "react";
import type { DocumentBindings } from "./DocumentBindings.js";
import type { ColumnDef, TableRow } from "./table-types.js";
import {
  DEFAULT_SIGN_COLUMN_WIDTH,
  computeRowDocumentGutterWidth,
} from "./RowDocumentRenderable.js";
import type { RowDocumentRenderable } from "./RowDocumentRenderable.js";
import { useGutterPalette } from "./useGutterPalette.js";
import "./row-document.js";

export interface TableProps {
  columns: ColumnDef[];
  rows: TableRow[];
  /** Maximum width for the table. If not provided, uses terminal width. */
  maxWidth?: number;
  /** Minimum width for any column (default: 4) */
  minColumnWidth?: number;
  /** Maximum width for any column (default: 50) */
  maxColumnWidth?: number;
  /** Number of rows to sample for width calculation (default: 100) */
  sampleSize?: number;
  /** Show line numbers in the gutter (default: true) */
  showLineNumbers?: boolean;
  /**
   * Binds the data rows to a document controller: its ref, the decoration
   * layers to paint, and the mouse handler. Rows are data-row indices; the
   * fixed header sits outside the row document. Omit it to render a static,
   * non-interactive table.
   */
  document?: DocumentBindings;
  /** Column width mode: "content" sizes to content (default), "fill" expands to fill available width */
  columnWidthMode?: "content" | "fill";
}

const PADDING = 1;
const MARGIN = 1; // horizontal margin on each side of the table
const DEFAULT_MIN_COL_WIDTH = 4;
const DEFAULT_MAX_COL_WIDTH = 80;
const DEFAULT_SAMPLE_SIZE = 100;

const isNumeric = function isNumeric(value: string): boolean {
  return /^\s*-?[\d,]+\.?\d*\s*$/u.test(value);
};

interface ColumnWidthOptions {
  minColumnWidth: number;
  maxColumnWidth: number;
  sampleSize: number;
  columnWidthMode?: "content" | "fill";
}

const sampleRows = function sampleRows(rows: string[][], sampleSize: number): string[][] {
  if (rows.length <= sampleSize) {
    return rows;
  }
  // Sample evenly distributed rows for representative widths
  const step = rows.length / sampleSize;
  const sampled: string[][] = [];
  for (let i = 0; i < sampleSize; i += 1) {
    sampled.push(rows[Math.floor(i * step)]);
  }
  return sampled;
};

const computeColumnWidths = function computeColumnWidths(
  headers: string[],
  rows: string[][],
  maxWidth: number,
  options: ColumnWidthOptions,
): number[] {
  const { minColumnWidth, maxColumnWidth, sampleSize } = options;
  const colCount = headers.length;

  // Sample rows for performance on large tables
  const sampledRows = sampleRows(rows, sampleSize);

  // Calculate natural width for each column (header + content + padding)
  // Use Bun.stringWidth for correct display width with CJK/emoji
  const naturalWidths = headers.map((header, col) => {
    const headerLen = Bun.stringWidth(header);
    let maxRowLen = 0;
    const sampledRowCount = sampledRows.length;
    for (let rowIndex = 0; rowIndex < sampledRowCount; rowIndex += 1) {
      if (rowIndex in sampledRows) {
        const row = sampledRows[rowIndex];
        maxRowLen = Math.max(maxRowLen, Bun.stringWidth(row[col] ?? ""));
      }
    }
    const contentWidth = Math.max(headerLen, maxRowLen);
    // Apply min/max constraints before adding padding
    const constrainedWidth = Math.min(maxColumnWidth, Math.max(minColumnWidth, contentWidth));
    return constrainedWidth + PADDING * 2;
  });

  // No border overhead -- flexbox rows don't have border characters
  const totalNatural = naturalWidths.reduce((a, b) => a + b, 0);

  // If everything fits, use natural widths (or distribute extra space in fill mode)
  if (totalNatural <= maxWidth) {
    if (options.columnWidthMode === "fill" && totalNatural < maxWidth) {
      const extra = maxWidth - totalNatural;
      const perCol = Math.floor(extra / colCount);
      const remainder = extra - perCol * colCount;
      return naturalWidths.map((w, i) => w + perCol + (i < remainder ? 1 : 0));
    }
    return naturalWidths;
  }

  const available = maxWidth;
  const minColWidthWithPadding = minColumnWidth + PADDING * 2;

  // Extreme case: not even minimum widths fit
  if (maxWidth <= colCount * minColWidthWithPadding) {
    return naturalWidths.map(() =>
      Math.max(minColWidthWithPadding, Math.floor(available / colCount)),
    );
  }

  // Give compact columns their natural width, distribute rest proportionally
  const compact: boolean[] = naturalWidths.map((w) => w <= 20);
  const compactTotal = naturalWidths.reduce((sum, w, i) => sum + (compact[i] ? w : 0), 0);
  const remaining = available - compactTotal;
  const longTotal = naturalWidths.reduce((sum, w, i) => sum + (compact[i] ? 0 : w), 0);

  if (longTotal === 0 || remaining <= 0) {
    // All compact or no space left -- distribute evenly
    const total = naturalWidths.reduce((a, b) => a + b, 0);
    return naturalWidths.map((w) =>
      Math.max(minColWidthWithPadding, Math.floor((w / total) * available)),
    );
  }

  return naturalWidths.map((w, i) => {
    if (compact[i]) {
      return w;
    }
    return Math.max(minColWidthWithPadding, Math.floor((w / longTotal) * remaining));
  });
};

const formatCellValue = function formatCellValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const Table = function Table({
  columns,
  rows,
  maxWidth,
  minColumnWidth = DEFAULT_MIN_COL_WIDTH,
  maxColumnWidth = DEFAULT_MAX_COL_WIDTH,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  showLineNumbers = true,
  document,
  columnWidthMode = "content",
}: TableProps) {
  const { theme } = useTheme();
  const palette = useGutterPalette();
  const { width: terminalWidth } = useTerminalDimensions();
  const internalDocRef = useRef<RowDocumentRenderable | null>(null);
  const rowDocumentRef = document?.ref ?? internalDocRef;

  // Compute available content width: start with total space, subtract margins and gutter
  const gutterWidth = useMemo(
    () =>
      computeRowDocumentGutterWidth({
        rowCount: rows.length,
        showLineNumbers,
        signColumnWidth: DEFAULT_SIGN_COLUMN_WIDTH,
      }),
    [showLineNumbers, rows.length],
  );
  const effectiveMaxWidth = Math.max(0, (maxWidth ?? terminalWidth) - MARGIN * 2 - gutterWidth);

  const headers = useMemo(() => columns.map((column) => column.header ?? column.key), [columns]);
  const normalizedRows = useMemo(
    () => rows.map((row) => columns.map((column) => formatCellValue(row[column.key]))),
    [columns, rows],
  );

  const colWidths = useMemo(
    () =>
      computeColumnWidths(headers, normalizedRows, effectiveMaxWidth, {
        columnWidthMode,
        maxColumnWidth,
        minColumnWidth,
        sampleSize,
      }),
    [
      headers,
      normalizedRows,
      effectiveMaxWidth,
      minColumnWidth,
      maxColumnWidth,
      sampleSize,
      columnWidthMode,
    ],
  );

  // Detect right-aligned columns: explicit align prop or auto-detect numeric
  const alignments = useMemo(
    () =>
      columns.map((column, colIdx) => {
        if (column.align === "right") {
          return true;
        }
        if (column.align === "left") {
          return false;
        }
        const sampleValues = normalizedRows.slice(0, 10).map((row) => row[colIdx] ?? "");
        const numericCount = sampleValues.filter(isNumeric).length;
        return numericCount > sampleValues.length / 2;
      }),
    [columns, normalizedRows],
  );

  const rowElements = useMemo(
    () =>
      normalizedRows.map((row, i) => (
        <box key={i} style={{ flexDirection: "row" }}>
          {row.map((cell, j) => {
            const contentWidth = colWidths[j] - PADDING * 2;
            const cellWidth = Bun.stringWidth(cell);
            const displayCell =
              alignments[j] && cellWidth <= contentWidth
                ? " ".repeat(contentWidth - cellWidth) + cell
                : cell;
            return (
              <text
                key={j}
                content={displayCell}
                wrapMode="word"
                style={{
                  paddingLeft: PADDING,
                  paddingRight: PADDING,
                  width: colWidths[j],
                }}
                fg={theme.text}
              />
            );
          })}
        </box>
      )),
    [normalizedRows, colWidths, alignments, theme.text],
  );

  return (
    <box
      style={{
        flexDirection: "column",
        flexGrow: 1,
        marginBottom: MARGIN,
        marginLeft: MARGIN,
        marginRight: MARGIN,
      }}
    >
      {/* Fixed header row — outside row-document so it stays visible */}
      <box style={{ flexDirection: "row", flexShrink: 0, paddingLeft: gutterWidth }}>
        {headers.map((h, i) => (
          <text
            key={i}
            content={h}
            style={{ paddingLeft: PADDING, paddingRight: PADDING, width: colWidths[i] }}
            fg={theme.primary}
          />
        ))}
      </box>

      {/* Fixed header underline */}
      <box style={{ flexDirection: "row", flexShrink: 0, paddingLeft: gutterWidth }}>
        {colWidths.map((w, i) => (
          <text
            key={i}
            content={"\u2500".repeat(w - PADDING * 2)}
            style={{ paddingLeft: PADDING, paddingRight: PADDING, width: w }}
            fg={theme.border}
          />
        ))}
      </box>

      {/* Scrollable data rows */}
      <row-document
        ref={rowDocumentRef}
        mode="multi"
        rowChildOffset={0}
        showGutter={true}
        showLineNumbers={showLineNumbers}
        signColumnWidth={DEFAULT_SIGN_COLUMN_WIDTH}
        palette={palette}
        decorations={document?.decorations}
        style={{ flexGrow: 1 }}
        onMouseDown={document?.onMouseDown}
      >
        {rowElements}
      </row-document>
    </box>
  );
};

// Exported for testing and MarkdownView
export { computeColumnWidths, isNumeric, sampleRows };
export type { ColumnWidthOptions };
