import { useTheme, type ResolvedTheme } from "../theme.tsx"

export interface TableProps {
  headers: string[]
  rows: string[][]
  maxWidth?: number
}

const PADDING = 1
const THRESHOLD = 20
const ELLIPSIS = "…"

function isNumeric(value: string): boolean {
  return /^\s*-?[\d,]+\.?\d*\s*$/.test(value)
}

function computeColumnWidths(headers: string[], rows: string[][], maxWidth: number): number[] {
  const colCount = headers.length
  const naturalWidths = headers.map((header, col) => {
    const headerLen = header.length
    const maxRowLen = rows.reduce((max, row) => Math.max(max, (row[col] ?? "").length), 0)
    return Math.max(headerLen, maxRowLen) + PADDING * 2
  })

  // 1 for each column border + 1 for trailing border
  const borderOverhead = colCount + 1
  const totalNatural = naturalWidths.reduce((a, b) => a + b, 0) + borderOverhead

  if (totalNatural <= maxWidth) {
    return naturalWidths
  }

  const available = maxWidth - borderOverhead
  if (available <= colCount) {
    return naturalWidths.map(() => Math.max(1, Math.floor(available / colCount)))
  }

  // Give compact columns their natural width, distribute rest proportionally
  const compact: boolean[] = naturalWidths.map((w) => w <= THRESHOLD)
  const compactTotal = naturalWidths.reduce((sum, w, i) => sum + (compact[i] ? w : 0), 0)
  const remaining = available - compactTotal
  const longTotal = naturalWidths.reduce((sum, w, i) => sum + (compact[i] ? 0 : w), 0)

  if (longTotal === 0 || remaining <= 0) {
    // All compact or no space left — distribute evenly
    const total = naturalWidths.reduce((a, b) => a + b, 0)
    return naturalWidths.map((w) => Math.max(3, Math.floor((w / total) * available)))
  }

  return naturalWidths.map((w, i) => {
    if (compact[i]) return w
    return Math.max(3, Math.floor((w / longTotal) * remaining))
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

function buildBorderLine(widths: number[], left: string, mid: string, right: string, fill: string): string {
  return left + widths.map((w) => fill.repeat(w)).join(mid) + right
}

function buildDataLine(cells: string[], widths: number[], alignments: boolean[]): string {
  const parts = cells.map((cell, i) => padCell(cell, widths[i], alignments[i]))
  return "│" + parts.join("│") + "│"
}

export function Table({ headers, rows, maxWidth = 80 }: TableProps) {
  const { theme } = useTheme()
  const colWidths = computeColumnWidths(headers, rows, maxWidth)
  const alignments = headers.map((_, col) => {
    const sampleValues = rows.slice(0, 10).map((row) => row[col] ?? "")
    const numericCount = sampleValues.filter(isNumeric).length
    return numericCount > sampleValues.length / 2
  })

  const topBorder = buildBorderLine(colWidths, "┌", "┬", "┐", "─")
  const headerSep = buildBorderLine(colWidths, "├", "┼", "┤", "─")
  const bottomBorder = buildBorderLine(colWidths, "└", "┴", "┘", "─")

  const headerLine = buildDataLine(headers, colWidths, alignments)
  const dataLines = rows.map((row) => {
    const cells = headers.map((_, col) => row[col] ?? "")
    return buildDataLine(cells, colWidths, alignments)
  })

  return (
    <box style={{ flexDirection: "column", marginLeft: 1, marginRight: 1, marginBottom: 1 }}>
      <text content={topBorder} fg={theme.border} />
      <text content={headerLine} fg={theme.primary} />
      <text content={headerSep} fg={theme.border} />
      {dataLines.map((line, i) => (
        <text
          key={i}
          content={line}
          fg={theme.text}
          bg={i % 2 === 1 ? theme.backgroundElement : undefined}
        />
      ))}
      <text content={bottomBorder} fg={theme.border} />
    </box>
  )
}

// Exported for testing
export { computeColumnWidths, truncate, padCell, isNumeric, buildBorderLine, buildDataLine }
