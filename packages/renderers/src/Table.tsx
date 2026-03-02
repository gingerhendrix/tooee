import { useTerminalDimensions } from "@opentui/react"
import { useTheme } from "@tooee/themes"
import { useEffect, useRef, type RefObject } from "react"
import type { ColumnDef, TableRow } from "./table-types.js"
import type { RowDocumentRenderable, RowDocumentPalette, RowDocumentDecorations } from "./RowDocumentRenderable.js"
import "./row-document.js"

export interface TableProps {
  columns: ColumnDef[]
  rows: TableRow[]
  /** Maximum width for the table. If not provided, uses terminal width. */
  maxWidth?: number
  /** Minimum width for any column (default: 4) */
  minColumnWidth?: number
  /** Maximum width for any column (default: 50) */
  maxColumnWidth?: number
  /** Number of rows to sample for width calculation (default: 100) */
  sampleSize?: number
  /** Show line numbers in the gutter (default: true) */
  showLineNumbers?: boolean
  cursor?: number
  selectionStart?: number
  selectionEnd?: number
  matchingRows?: Set<number>
  currentMatchRow?: number
  toggledRows?: Set<number>
  docRef?: RefObject<RowDocumentRenderable | null>
  /** Column width mode: "content" sizes to content (default), "fill" expands to fill available width */
  columnWidthMode?: "content" | "fill"
}

const PADDING = 1
const MARGIN = 1 // horizontal margin on each side of the table
const DEFAULT_MIN_COL_WIDTH = 4
const DEFAULT_MAX_COL_WIDTH = 50
const DEFAULT_SAMPLE_SIZE = 100

function isNumeric(value: string): boolean {
  return /^\s*-?[\d,]+\.?\d*\s*$/.test(value)
}

interface ColumnWidthOptions {
  minColumnWidth: number
  maxColumnWidth: number
  sampleSize: number
  columnWidthMode?: "content" | "fill"
}

function sampleRows(rows: string[][], sampleSize: number): string[][] {
  if (rows.length <= sampleSize) return rows
  // Sample evenly distributed rows for representative widths
  const step = rows.length / sampleSize
  const sampled: string[][] = []
  for (let i = 0; i < sampleSize; i++) {
    sampled.push(rows[Math.floor(i * step)])
  }
  return sampled
}

function computeColumnWidths(
  headers: string[],
  rows: string[][],
  maxWidth: number,
  options: ColumnWidthOptions,
): number[] {
  const { minColumnWidth, maxColumnWidth, sampleSize } = options
  const colCount = headers.length

  // Sample rows for performance on large tables
  const sampledRows = sampleRows(rows, sampleSize)

  // Calculate natural width for each column (header + content + padding)
  // Use Bun.stringWidth for correct display width with CJK/emoji
  const naturalWidths = headers.map((header, col) => {
    const headerLen = Bun.stringWidth(header)
    const maxRowLen = sampledRows.reduce((max, row) => Math.max(max, Bun.stringWidth(row[col] ?? "")), 0)
    const contentWidth = Math.max(headerLen, maxRowLen)
    // Apply min/max constraints before adding padding
    const constrainedWidth = Math.min(maxColumnWidth, Math.max(minColumnWidth, contentWidth))
    return constrainedWidth + PADDING * 2
  })

  // No border overhead -- flexbox rows don't have border characters
  const totalNatural = naturalWidths.reduce((a, b) => a + b, 0)

  // If everything fits, use natural widths (or distribute extra space in fill mode)
  if (totalNatural <= maxWidth) {
    if (options.columnWidthMode === "fill" && totalNatural < maxWidth) {
      const extra = maxWidth - totalNatural
      const perCol = Math.floor(extra / colCount)
      const remainder = extra - perCol * colCount
      return naturalWidths.map((w, i) => w + perCol + (i < remainder ? 1 : 0))
    }
    return naturalWidths
  }

  const available = maxWidth
  const minColWidthWithPadding = minColumnWidth + PADDING * 2

  // Extreme case: not even minimum widths fit
  if (maxWidth <= colCount * minColWidthWithPadding) {
    return naturalWidths.map(() =>
      Math.max(minColWidthWithPadding, Math.floor(available / colCount)),
    )
  }

  // Give compact columns their natural width, distribute rest proportionally
  const compact: boolean[] = naturalWidths.map((w) => w <= 20)
  const compactTotal = naturalWidths.reduce((sum, w, i) => sum + (compact[i] ? w : 0), 0)
  const remaining = available - compactTotal
  const longTotal = naturalWidths.reduce((sum, w, i) => sum + (compact[i] ? 0 : w), 0)

  if (longTotal === 0 || remaining <= 0) {
    // All compact or no space left -- distribute evenly
    const total = naturalWidths.reduce((a, b) => a + b, 0)
    return naturalWidths.map((w) =>
      Math.max(minColWidthWithPadding, Math.floor((w / total) * available)),
    )
  }

  return naturalWidths.map((w, i) => {
    if (compact[i]) return w
    return Math.max(minColWidthWithPadding, Math.floor((w / longTotal) * remaining))
  })
}

/**
 * Pre-compute gutter width to subtract from available column space.
 * Mirrors RowDocumentRenderable._computeGutterWidth logic.
 */
function computeGutterWidth(rowCount: number, showLineNumbers: boolean): number {
  let width = 0
  if (showLineNumbers) {
    // lineNumberStart defaults to 1, so max line number = rowCount
    const maxLineNum = rowCount
    width += Math.max(String(maxLineNum).length, 1)
  }
  width += 1 // signColumnWidth
  width += 1 // gutterPaddingRight (default)
  return width
}

function formatCellValue(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value instanceof Date) return value.toISOString()
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function Table({
  columns,
  rows,
  maxWidth,
  minColumnWidth = DEFAULT_MIN_COL_WIDTH,
  maxColumnWidth = DEFAULT_MAX_COL_WIDTH,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  showLineNumbers = true,
  cursor,
  selectionStart,
  selectionEnd,
  matchingRows,
  currentMatchRow,
  toggledRows,
  docRef,
  columnWidthMode = "content",
}: TableProps) {
  const { theme } = useTheme()
  const { width: terminalWidth } = useTerminalDimensions()

  // Compute available content width: start with total space, subtract margins and gutter
  const gutterWidth = computeGutterWidth(rows.length, showLineNumbers)
  const effectiveMaxWidth = Math.max(0, (maxWidth ?? terminalWidth) - MARGIN * 2 - gutterWidth)

  const headers = columns.map((column) => column.header ?? column.key)
  const normalizedRows = rows.map((row) =>
    columns.map((column) => formatCellValue(row[column.key])),
  )

  const colWidths = computeColumnWidths(headers, normalizedRows, effectiveMaxWidth, {
    minColumnWidth,
    maxColumnWidth,
    sampleSize,
    columnWidthMode,
  })

  // Detect right-aligned columns: explicit align prop or auto-detect numeric
  const alignments = columns.map((column, colIdx) => {
    if (column.align === "right") return true
    if (column.align === "left") return false
    const sampleValues = normalizedRows.slice(0, 10).map((row) => row[colIdx] ?? "")
    const numericCount = sampleValues.filter(isNumeric).length
    return numericCount > sampleValues.length / 2
  })

  const internalRef = useRef<RowDocumentRenderable>(null)
  const effectiveRef = docRef ?? internalRef

  const palette: RowDocumentPalette = {
    gutterFg: theme.textMuted,
    gutterBg: theme.backgroundElement,
    cursorSignFg: theme.primary,
    matchSignFg: theme.warning,
    currentMatchSignFg: theme.primary,
    cursorBg: theme.cursorLine,
    selectionBg: theme.selection,
    matchBg: theme.warning,
    currentMatchBg: theme.primary,
    toggledBg: theme.backgroundPanel,
  }

  useEffect(() => {
    const decorations: RowDocumentDecorations = {
      cursorRow: cursor,
      selection: selectionStart != null && selectionEnd != null
        ? { start: selectionStart, end: selectionEnd }
        : null,
      matchingRows: matchingRows,
      currentMatchRow: currentMatchRow,
      toggledRows: toggledRows,
    }
    effectiveRef.current?.setDecorations(decorations)
  }, [cursor, selectionStart, selectionEnd, matchingRows, currentMatchRow, toggledRows])

  return (
    <box style={{ flexDirection: "column", flexGrow: 1, marginLeft: MARGIN, marginRight: MARGIN, marginBottom: MARGIN }}>
      {/* Fixed header row — outside row-document so it stays visible */}
      <box style={{ flexDirection: "row", flexShrink: 0, paddingLeft: gutterWidth }}>
        {headers.map((h, i) => (
          <text
            key={i}
            content={h}
            style={{ width: colWidths[i], paddingLeft: PADDING, paddingRight: PADDING }}
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
            style={{ width: w, paddingLeft: PADDING, paddingRight: PADDING }}
            fg={theme.border}
          />
        ))}
      </box>

      {/* Scrollable data rows */}
      <row-document
        ref={effectiveRef}
        mode="multi"
        rowChildOffset={0}
        showGutter={true}
        showLineNumbers={showLineNumbers}
        signColumnWidth={1}
        palette={palette}
        style={{ flexGrow: 1 }}
      >
        {normalizedRows.map((row, i) => (
          <box key={i} style={{ flexDirection: "row" }}>
            {row.map((cell, j) => {
              const contentWidth = colWidths[j] - PADDING * 2
              const cellWidth = Bun.stringWidth(cell)
              const displayCell = alignments[j] && cellWidth <= contentWidth
                ? " ".repeat(contentWidth - cellWidth) + cell
                : cell
              return (
                <text
                  key={j}
                  content={displayCell}
                  wrapMode="word"
                  style={{
                    width: colWidths[j],
                    paddingLeft: PADDING,
                    paddingRight: PADDING,
                  }}
                  fg={theme.text}
                />
              )
            })}
          </box>
        ))}
      </row-document>
    </box>
  )
}

// Exported for testing and MarkdownView
export {
  computeColumnWidths,
  isNumeric,
  sampleRows,
}
export type { ColumnWidthOptions }
