import type { ColumnDef, TableRow } from "./table-types.js"

export interface ParsedTable {
  columns: ColumnDef[]
  rows: TableRow[]
  format: Format
}

export function parseCSV(input: string): { columns: ColumnDef[]; rows: TableRow[] } {
  const lines = splitLines(input)
  if (lines.length === 0) return { columns: [], rows: [] }
  const columns = createColumnDefs(parseCSVLine(lines[0]))
  const rows = buildRows(columns, lines.slice(1).map(parseCSVLine))
  return { columns, rows }
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      i++
      let field = ""
      while (i < line.length) {
        if (line[i] === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            field += '"'
            i += 2
          } else {
            i++ // closing quote
            break
          }
        } else {
          field += line[i]
          i++
        }
      }
      fields.push(field)
      if (i < line.length && line[i] === ",") i++ // skip comma
    } else {
      const nextComma = line.indexOf(",", i)
      if (nextComma === -1) {
        fields.push(line.slice(i))
        break
      } else {
        fields.push(line.slice(i, nextComma))
        i = nextComma + 1
      }
    }
  }
  return fields
}

export function parseTSV(input: string): { columns: ColumnDef[]; rows: TableRow[] } {
  const lines = splitLines(input)
  if (lines.length === 0) return { columns: [], rows: [] }
  const columns = createColumnDefs(lines[0].split("\t"))
  const rows = buildRows(columns, lines.slice(1).map((line) => line.split("\t")))
  return { columns, rows }
}

export function parseJSON(input: string): { columns: ColumnDef[]; rows: TableRow[] } {
  const data = JSON.parse(input)
  if (!Array.isArray(data) || data.length === 0) return { columns: [], rows: [] }
  const keys = Array.from(
    new Set(data.flatMap((item: Record<string, unknown>) => Object.keys(item))),
  )
  const columns: ColumnDef[] = keys.map((key) => ({ key, header: key }))
  const rows = data.map((item: Record<string, unknown>) => {
    const row: TableRow = {}
    for (const column of columns) {
      row[column.key] = item[column.key] ?? ""
    }
    return row
  })
  return { columns, rows }
}

export type Format = "csv" | "tsv" | "json" | "unknown"

export function detectFormat(input: string): Format {
  const trimmed = input.trimStart()
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return "json"
    } catch {}
  }
  const firstLine = input.split("\n")[0] ?? ""
  if (firstLine.includes("\t")) return "tsv"
  if (firstLine.includes(",")) return "csv"
  return "unknown"
}

export function parseAuto(input: string): ParsedTable {
  const format = detectFormat(input)
  let columns: ColumnDef[]
  let rows: TableRow[]
  switch (format) {
    case "csv":
      ;({ columns, rows } = parseCSV(input))
      break
    case "tsv":
      ;({ columns, rows } = parseTSV(input))
      break
    case "json":
      ;({ columns, rows } = parseJSON(input))
      break
    default:
      // Fall back to CSV
      ;({ columns, rows } = parseCSV(input))
      break
  }
  return { columns, rows, format }
}

function splitLines(input: string): string[] {
  return input.split("\n").filter((line) => line.trim().length > 0)
}

function createColumnDefs(rawHeaders: string[]): ColumnDef[] {
  const seen = new Map<string, number>()
  return rawHeaders.map((header, index) => {
    const trimmed = header.trim()
    const fallback = `column_${index + 1}`
    const base = trimmed === "" ? fallback : trimmed
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    const key = count === 0 ? base : `${base}_${count + 1}`
    return {
      key,
      header: trimmed || undefined,
    }
  })
}

function buildRows(columns: ColumnDef[], rawRows: string[][]): TableRow[] {
  return rawRows.map((row) => {
    const record: TableRow = {}
    columns.forEach((column, index) => {
      record[column.key] = row[index] ?? ""
    })
    return record
  })
}
