import { useTerminalDimensions } from "@opentui/react"
import { useTheme } from "@tooee/themes"
import type { ColumnDef, TableRow } from "./table-types.js"

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
  cursor?: number
  selectionStart?: number
  selectionEnd?: number
  matchingRows?: Set<number>
  currentMatchRow?: number
  toggledRows?: Set<number>
}

const PADDING = 1
const THRESHOLD = 20
const ELLIPSIS = "…"
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
  const naturalWidths = headers.map((header, col) => {
    const headerLen = header.length
    const maxRowLen = sampledRows.reduce((max, row) => Math.max(max, (row[col] ?? "").length), 0)
    const contentWidth = Math.max(headerLen, maxRowLen)
    // Apply min/max constraints before adding padding
    const constrainedWidth = Math.min(maxColumnWidth, Math.max(minColumnWidth, contentWidth))
    return constrainedWidth + PADDING * 2
  })

  // 1 for each column border + 1 for trailing border
  const borderOverhead = colCount + 1
  const totalNatural = naturalWidths.reduce((a, b) => a + b, 0) + borderOverhead

  // If everything fits, use natural widths
  if (totalNatural <= maxWidth) {
    return naturalWidths
  }

  const available = maxWidth - borderOverhead
  const minColWidthWithPadding = minColumnWidth + PADDING * 2

  // Extreme case: not even minimum widths fit
  if (available <= colCount * minColWidthWithPadding) {
    return naturalWidths.map(() =>
      Math.max(minColWidthWithPadding, Math.floor(available / colCount)),
    )
  }

  // Give compact columns their natural width, distribute rest proportionally
  const compact: boolean[] = naturalWidths.map((w) => w <= THRESHOLD)
  const compactTotal = naturalWidths.reduce((sum, w, i) => sum + (compact[i] ? w : 0), 0)
  const remaining = available - compactTotal
  const longTotal = naturalWidths.reduce((sum, w, i) => sum + (compact[i] ? 0 : w), 0)

  if (longTotal === 0 || remaining <= 0) {
    // All compact or no space left — distribute evenly
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

function truncate(text: string, width: number): string {
  const contentWidth = width - PADDING * 2
  if (contentWidth <= 0) return ""
  if (text.length <= contentWidth) return text
  if (contentWidth <= 1) return ELLIPSIS.slice(0, contentWidth)
  return text.slice(0, contentWidth - 1) + ELLIPSIS
}

function padCell(text: string, width: number, rightAlign: boolean): string {
  const contentWidth = width - PADDING * 2
  const truncated = truncate(text, width)
  const padLeft = " ".repeat(PADDING)
  const padRight = " ".repeat(PADDING)
  if (rightAlign) {
    const space = contentWidth - truncated.length
    return padLeft + " ".repeat(Math.max(0, space)) + truncated + padRight
  }
  const space = contentWidth - truncated.length
  return padLeft + truncated + " ".repeat(Math.max(0, space)) + padRight
}

function buildBorderLine(
  widths: number[],
  left: string,
  mid: string,
  right: string,
  fill: string,
): string {
  return left + widths.map((w) => fill.repeat(w)).join(mid) + right
}

function buildDataLine(cells: string[], widths: number[], alignments: boolean[]): string {
  const parts = cells.map((cell, i) => padCell(cell, widths[i], alignments[i]))
  return "│" + parts.join("│") + "│"
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
  cursor,
  selectionStart,
  selectionEnd,
  matchingRows,
  currentMatchRow,
  toggledRows,
}: TableProps) {
  const { theme } = useTheme()
  const { width: terminalWidth } = useTerminalDimensions()

  // Use terminal width minus margins (1 on each side) if maxWidth not provided
  const effectiveMaxWidth = maxWidth ?? terminalWidth - 2

  const headers = columns.map((column) => column.header ?? column.key)
  const normalizedRows = rows.map((row) =>
    columns.map((column) => formatCellValue(row[column.key])),
  )

  const colWidths = computeColumnWidths(headers, normalizedRows, effectiveMaxWidth, {
    minColumnWidth,
    maxColumnWidth,
    sampleSize,
  })
  const alignments = columns.map((column, colIdx) => {
    if (column.align === "right") return true
    if (column.align === "left") return false
    const sampleValues = normalizedRows.slice(0, 10).map((row) => row[colIdx] ?? "")
    const numericCount = sampleValues.filter(isNumeric).length
    return numericCount > sampleValues.length / 2
  })

  const topBorder = buildBorderLine(colWidths, "┌", "┬", "┐", "─")
  const headerSep = buildBorderLine(colWidths, "├", "┼", "┤", "─")
  const bottomBorder = buildBorderLine(colWidths, "└", "┴", "┘", "─")

  const headerLine = buildDataLine(headers, colWidths, alignments)
  const dataLines = normalizedRows.map((row) => buildDataLine(row, colWidths, alignments))

  const getRowStyle = (rowIndex: number): { fg?: string; bg?: string } => {
    const isCursor = cursor === rowIndex
    const isSelected =
      selectionStart != null &&
      selectionEnd != null &&
      rowIndex >= selectionStart &&
      rowIndex <= selectionEnd
    const isMatch = matchingRows?.has(rowIndex)
    const isCurrentMatch = currentMatchRow === rowIndex
    const isToggled = toggledRows?.has(rowIndex)

    let bg: string | undefined
    let fg: string | undefined = theme.text

    // Determine background: selection < cursor (cursor overwrites)
    if (isSelected) {
      bg = theme.selection
    }
    if (isToggled && !isCursor && !isSelected) {
      bg = theme.backgroundPanel
    }
    if (isCursor) {
      bg = theme.cursorLine
    }

    // Highlight match indicator on matching rows
    if (isMatch && !isCursor) {
      fg = isCurrentMatch ? theme.primary : theme.warning
    }

    return { fg, bg }
  }

  return (
    <box style={{ flexDirection: "column", marginLeft: 1, marginRight: 1, marginBottom: 1 }}>
      <text content={topBorder} fg={theme.border} />
      <text content={headerLine} fg={theme.primary} />
      <text content={headerSep} fg={theme.border} />
      {dataLines.map((line, i) => {
        const style = getRowStyle(i)
        return <text key={i} content={line} fg={style.fg} bg={style.bg} />
      })}
      <text content={bottomBorder} fg={theme.border} />
    </box>
  )
}

// Exported for testing
export {
  computeColumnWidths,
  truncate,
  padCell,
  isNumeric,
  buildBorderLine,
  buildDataLine,
  sampleRows,
}
export type { ColumnWidthOptions }
