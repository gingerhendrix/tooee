import { useState, useEffect } from "react"
import type { MarkSet } from "@tooee/marks"
import type {
  AnyContent,
  Content,
  ContentFormat,
  ContentProvider,
  ContentChunk,
  CustomContent,
} from "../types.js"

function isAsyncIterable(value: unknown): value is AsyncIterable<ContentChunk> {
  return value != null && typeof value === "object" && Symbol.asyncIterator in value
}

function createEmptyContent(format: string, title?: string): AnyContent {
  switch (format) {
    case "markdown":
      return { format, markdown: "", title }
    case "code":
      return { format, code: "", title }
    case "text":
      return { format, text: "", title }
    case "image":
      return { format, src: "", title }
    case "table":
      return { format, columns: [], rows: [], title }
    default:
      return { format, data: undefined, title } as CustomContent
  }
}

function ensureContentFormat<F extends ContentFormat>(
  current: AnyContent | null,
  format: F,
  title?: string,
): Extract<Content, { format: F }> {
  if (!current || current.format !== format) {
    return createEmptyContent(format, title) as Extract<Content, { format: F }>
  }
  return current as Extract<Content, { format: F }>
}

function applyContentChunk(
  current: AnyContent | null,
  chunk: ContentChunk,
  title?: string,
): AnyContent {
  switch (chunk.type) {
    case "replace":
      return chunk.content
    case "append":
      if (chunk.format === "markdown") {
        const target = ensureContentFormat(current, "markdown", title)
        return { ...target, markdown: target.markdown + chunk.data }
      }
      if (chunk.format === "code") {
        const target = ensureContentFormat(current, "code", title)
        return {
          ...target,
          code: target.code + chunk.data,
          language: chunk.language ?? target.language,
        }
      }
      {
        const target = ensureContentFormat(current, "text", title)
        return { ...target, text: target.text + chunk.data }
      }
    case "patch":
      return chunk.apply(current)
    default:
      return current ?? createEmptyContent("markdown", title)
  }
}

export function useContentLoader(contentProvider: ContentProvider, reloadTrigger: number) {
  const [content, setContent] = useState<AnyContent | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [providerMarks, setProviderMarks] = useState<MarkSet[]>([])

  useEffect(() => {
    setError(null)
    setStreaming(false)
    // Reset provider marks on reload; initialize with static marks if provided
    setProviderMarks(contentProvider.marks ?? [])
    const loaded = contentProvider.load()

    if (isAsyncIterable(loaded)) {
      const fallbackFormat = contentProvider.format ?? "markdown"
      const title = contentProvider.title
      let cancelled = false
      let current: AnyContent | null = createEmptyContent(fallbackFormat, title)
      setContent(current)
      setStreaming(true)

      ;(async () => {
        try {
          for await (const chunk of loaded) {
            if (cancelled) break
            if (chunk.type === "marks") {
              if (cancelled) break
              // Streamed mark set: merge by replacing any existing set with same namespace
              setProviderMarks((prev) => {
                const filtered = prev.filter((s) => s.namespace !== chunk.set.namespace)
                return [...filtered, chunk.set]
              })
              continue
            }
            current = applyContentChunk(current, chunk, title)
            setContent(current)
          }
        } catch (err) {
          if (!cancelled && err instanceof Error) {
            setError(err.message)
          }
        } finally {
          if (!cancelled) {
            setStreaming(false)
          }
        }
      })()

      return () => {
        cancelled = true
      }
    }

    if (loaded instanceof Promise) {
      let active = true
      loaded
        .then((value) => {
          if (active) setContent(value)
        })
        .catch((err: Error) => {
          if (active) setError(err.message)
        })
      return () => {
        active = false
      }
    }

    setContent(loaded)
  }, [contentProvider, reloadTrigger])

  return { content, streaming, error, providerMarks, setProviderMarks }
}
