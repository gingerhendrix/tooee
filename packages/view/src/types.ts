// Unified content type
export interface Content {
  body: string
  format: "markdown" | "code" | "text" | "image" | "table" | "directory"
  language?: string
  title?: string
}

// Streaming chunk
export interface ContentChunk {
  type: "append" | "replace"
  data: string
}

// Unified content provider — three return modes
export interface ContentProvider {
  load(): Content | Promise<Content> | AsyncIterable<ContentChunk>
  format?: Content["format"]
  title?: string
}

// Backward-compatible aliases
export type ViewContent = Content
export type ViewContentProvider = ContentProvider
