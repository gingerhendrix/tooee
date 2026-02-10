export interface TableContent {
  headers: string[]
  rows: string[][]
  title?: string
  format: "csv" | "tsv" | "json" | "unknown"
}

export function parseCSV(input: string): { headers: string[]; rows: string[][] } {
  const lines = splitLines(input)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0])
  const rows = lines.slice(1).map(parseCSVLine)
  return { headers, rows }
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

export function parseTSV(input: string): { headers: string[]; rows: string[][] } {
  const lines = splitLines(input)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split("\t")
  const rows = lines.slice(1).map((line) => line.split("\t"))
  return { headers, rows }
}

export function parseJSON(input: string): { headers: string[]; rows: string[][] } {
  const data = JSON.parse(input)
  if (!Array.isArray(data) || data.length === 0) return { headers: [], rows: [] }
  const headers = Object.keys(data[0])
  const rows = data.map((item: Record<string, unknown>) =>
    headers.map((key) => String(item[key] ?? "")),
  )
  return { headers, rows }
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

export function parseAuto(input: string): TableContent {
  const format = detectFormat(input)
  let headers: string[]
  let rows: string[][]
  switch (format) {
    case "csv":
      ;({ headers, rows } = parseCSV(input))
      break
    case "tsv":
      ;({ headers, rows } = parseTSV(input))
      break
    case "json":
      ;({ headers, rows } = parseJSON(input))
      break
    default:
      // Fall back to CSV
      ;({ headers, rows } = parseCSV(input))
      break
  }
  return { headers, rows, format }
}

function splitLines(input: string): string[] {
  return input.split("\n").filter((line) => line.trim().length > 0)
}
