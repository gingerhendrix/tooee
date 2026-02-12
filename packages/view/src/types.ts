import type { ColumnDef, TableRow } from "@tooee/renderers"

export type Content = MarkdownContent | CodeContent | TextContent | ImageContent | TableContent

export type ContentFormat = Content["format"]

interface BaseContent {
  title?: string
}

export interface MarkdownContent extends BaseContent {
  format: "markdown"
  markdown: string
}

export interface CodeContent extends BaseContent {
  format: "code"
  code: string
  language?: string
}

export interface TextContent extends BaseContent {
  format: "text"
  text: string
}

export interface ImageContent extends BaseContent {
  format: "image"
  src: string
}

export interface TableContent extends BaseContent {
  format: "table"
  columns: ColumnDef[]
  rows: TableRow[]
}

export type AppendableFormat = Extract<ContentFormat, "markdown" | "code" | "text">

export type ContentChunk =
  | {
      type: "append"
      format: AppendableFormat
      data: string
      language?: string
    }
  | {
      type: "replace"
      content: Content
    }
  | {
      type: "patch"
      apply: (current: Content | null) => Content
    }

export interface ContentProvider {
  load(): Content | Promise<Content> | AsyncIterable<ContentChunk>
  format?: ContentFormat
  title?: string
}

export type ViewContent = Content
export type ViewContentProvider = ContentProvider
export type { ColumnDef, TableRow } from "@tooee/renderers"

export function getTextContent(content: Content): string {
  switch (content.format) {
    case "markdown":
      return content.markdown
    case "code":
      return content.code
    case "text":
      return content.text
    case "image":
      return content.src
    case "table": {
      const headers = content.columns.map((column) => column.header ?? column.key)
      const rowLines = content.rows.map((row) =>
        content.columns.map((column) => stringifyCell(row[column.key])).join("\t"),
      )
      return [headers.join("\t"), ...rowLines].join("\n")
    }
    default:
      return ""
  }
}

function stringifyCell(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
