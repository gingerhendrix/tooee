import type { ReactNode } from "react"
import type { ColumnDef, TableRow } from "@tooee/renderers"

// === Built-in content types ===

export type Content = MarkdownContent | CodeContent | TextContent | ImageContent | TableContent

export type ContentFormat = Content["format"]

interface BaseContent {
  title?: string
  getTextContent?: () => string
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

// === Custom content ===

export interface CustomContent<T = unknown> {
  format: string
  data: T
  title?: string
  getTextContent?: () => string
}

/** Content or custom content — used where custom formats are accepted */
export type AnyContent = Content | CustomContent

// === Custom renderers ===

export interface ContentRendererProps {
  content: CustomContent
  lineCount: number
  cursor?: number
  selectionStart?: number
  selectionEnd?: number
}

export type ContentRenderer = (props: ContentRendererProps) => ReactNode

// === Streaming ===

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
      content: AnyContent
    }
  | {
      type: "patch"
      apply: (current: AnyContent | null) => AnyContent
    }

// === Provider ===

export interface ContentProvider {
  load(): AnyContent | Promise<AnyContent> | AsyncIterable<ContentChunk>
  format?: string
  title?: string
}

// === Compat aliases ===

export type ViewContent = Content
export type ViewContentProvider = ContentProvider
export type { ColumnDef, TableRow } from "@tooee/renderers"

// === Utilities ===

const BUILTIN_FORMATS: Set<string> = new Set(["markdown", "code", "text", "image", "table"])

export function isBuiltinContent(content: AnyContent): content is Content {
  return BUILTIN_FORMATS.has(content.format)
}

export function isCustomContent(content: AnyContent): content is CustomContent {
  return !BUILTIN_FORMATS.has(content.format)
}

export function getTextContent(content: AnyContent): string {
  if (content.getTextContent) {
    return content.getTextContent()
  }

  if (isCustomContent(content)) {
    return ""
  }

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
