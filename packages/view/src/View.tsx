import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { MarkdownView, CodeView, ImageView, Table } from "@tooee/renderers"
import { AppLayout } from "@tooee/layout"
import { useTheme } from "@tooee/themes"
import { useHasOverlay } from "@tooee/overlays"
import { useActions, useProvideCommandContext } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import {
  useThemeCommands,
  useQuitCommand,
  useCopyCommand,
  useModalNavigationCommands,
  useCommandPalette,
} from "@tooee/shell"
import { useConfig } from "@tooee/config"
import { marked } from "marked"
import {
  getTextContent,
  isBuiltinContent,
  isCustomContent,
  type AnyContent,
  type Content,
  type ContentFormat,
  type ContentProvider,
  type ContentChunk,
  type ContentRenderer,
  type CustomContent,
} from "./types.js"

interface ViewProps {
  contentProvider: ContentProvider
  actions?: ActionDefinition[]
  renderers?: Record<string, ContentRenderer>
}

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

export function View({ contentProvider, actions, renderers }: ViewProps) {
  const { theme } = useTheme()
  const config = useConfig()
  const [content, setContent] = useState<AnyContent | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollBoxRenderable>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const reload = useCallback(() => setReloadTrigger((n) => n + 1), [])

  useEffect(() => {
    setError(null)
    setStreaming(false)
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
            current = applyContentChunk(current, chunk, title)
            setContent(current)
          }
        } catch (error) {
          if (!cancelled && error instanceof Error) {
            setError(error.message)
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
        .catch((error: Error) => {
          if (active) setError(error.message)
        })
      return () => {
        active = false
      }
    }

    setContent(loaded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentProvider, reloadTrigger])

  const TABLE_VISUAL_HEADER_OFFSET = 3
  const TABLE_SEARCH_HEADER_OFFSET = 1

  const textContent = useMemo(() => (content ? getTextContent(content) : ""), [content])

  const lineCount = useMemo(() => {
    if (!content) return 0
    if (isBuiltinContent(content) && content.format === "table") {
      return content.rows.length + 3
    }
    return textContent.split("\n").length
  }, [content, textContent])

  const { blockCount, blockLineMap } = useMemo(() => {
    if (!content) return { blockCount: undefined, blockLineMap: undefined }
    if (!isBuiltinContent(content)) return { blockCount: undefined, blockLineMap: undefined }

    if (content.format === "table") {
      const map = content.rows.map((_: unknown, i: number) => i + TABLE_VISUAL_HEADER_OFFSET)
      return { blockCount: content.rows.length, blockLineMap: map }
    }

    if (content.format !== "markdown") {
      return { blockCount: undefined, blockLineMap: undefined }
    }

    const tokens = marked.lexer(content.markdown)
    const blocks = tokens.filter((t) => t.type !== "space")
    const lineMap: number[] = []
    let lineOffset = 0
    for (const token of tokens) {
      if (token.type === "space") {
        if ("raw" in token && typeof token.raw === "string") {
          lineOffset += token.raw.split("\n").length - 1
        }
        continue
      }
      lineMap.push(lineOffset)
      if ("raw" in token && typeof token.raw === "string") {
        lineOffset += token.raw.split("\n").length - 1
      }
    }
    return { blockCount: blocks.length, blockLineMap: lineMap }
  }, [content])

  const nav = useModalNavigationCommands({
    totalLines: lineCount,
    getText: () => (content ? textContent : undefined),
    blockCount,
    blockLineMap,
    searchLineOffset: content?.format === "table" ? TABLE_SEARCH_HEADER_OFFSET : 0,
    multiSelect: true,
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = nav.scrollOffset
    }
  }, [nav.scrollOffset])

  const { name: themeName } = useThemeCommands()
  useQuitCommand()
  useCopyCommand({
    getText: () => (content ? textContent : undefined),
  })

  const _palette = useCommandPalette()

  useActions(actions)
  const hasOverlay = useHasOverlay()

  function getActiveRow(): Record<string, unknown> | undefined {
    if (!content || !isBuiltinContent(content) || content.format !== "table") return undefined
    if (!nav.cursor) return undefined
    return content.rows[nav.cursor.line]
  }

  function getSelectedRows(): Record<string, unknown>[] {
    if (!content || !isBuiltinContent(content) || content.format !== "table") return []
    if (nav.toggledIndices.size) {
      return Array.from(nav.toggledIndices)
        .map((i) => content.rows[i])
        .filter(Boolean)
    }
    if (nav.selection) {
      const start = nav.selection.start.line
      const end = nav.selection.end.line
      return content.rows.slice(start, end + 1)
    }
    return []
  }

  useProvideCommandContext(() => ({
    view: {
      content,
      format: content?.format,
      cursor: nav.cursor,
      selection: nav.selection,
      mode: nav.mode,
      activeRow: getActiveRow(),
      selectedRows: getSelectedRows(),
      toggledIndices: nav.toggledIndices,
      reload,
    },
  }))

  const matchingLinesSet = useMemo(
    () => (nav.matchingLines.length > 0 ? new Set<number>(nav.matchingLines) : undefined),
    [nav.matchingLines],
  )
  const currentMatchLine =
    nav.matchingLines.length > 0 ? nav.matchingLines[nav.currentMatchIndex] : undefined

  // For markdown: convert matching lines to matching blocks
  const matchingBlocks = useMemo(() => {
    if (!matchingLinesSet || !blockLineMap || blockLineMap.length === 0) return undefined
    if (content?.format === "table") return undefined // table uses matchingRows instead
    const blocks = new Set<number>()
    for (const line of matchingLinesSet) {
      let blockIdx = 0
      for (let i = blockLineMap.length - 1; i >= 0; i--) {
        if (blockLineMap[i] <= line) {
          blockIdx = i
          break
        }
      }
      blocks.add(blockIdx)
    }
    return blocks.size > 0 ? blocks : undefined
  }, [matchingLinesSet, blockLineMap, content?.format])

  const currentMatchBlock = useMemo(() => {
    if (currentMatchLine == null || !blockLineMap || blockLineMap.length === 0) return undefined
    if (content?.format === "table") return undefined
    for (let i = blockLineMap.length - 1; i >= 0; i--) {
      if (blockLineMap[i] <= currentMatchLine) return i
    }
    return 0
  }, [currentMatchLine, blockLineMap, content?.format])

  // For table: convert matching lines to matching row indices
  const matchingRowsSet = useMemo(() => {
    if (!matchingLinesSet || content?.format !== "table") return undefined
    const rows = new Set<number>()
    for (const line of matchingLinesSet) {
      const row = line - TABLE_SEARCH_HEADER_OFFSET
      if (row >= 0) rows.add(row)
    }
    return rows.size > 0 ? rows : undefined
  }, [matchingLinesSet, content?.format])

  const currentMatchRow = useMemo(() => {
    if (content?.format !== "table" || currentMatchLine == null) return undefined
    const row = currentMatchLine - TABLE_SEARCH_HEADER_OFFSET
    return row >= 0 ? row : undefined
  }, [content?.format, currentMatchLine])

  const toggledBlocks = useMemo(() => {
    if (content?.format !== "markdown" || nav.toggledIndices.size === 0) return undefined
    return new Set<number>(nav.toggledIndices)
  }, [content?.format, nav.toggledIndices])

  const toggledRows = useMemo(() => {
    if (content?.format !== "table" || nav.toggledIndices.size === 0) return undefined
    return new Set<number>(nav.toggledIndices)
  }, [content?.format, nav.toggledIndices])

  const toggledLines = useMemo(() => {
    if (!content || (content.format !== "code" && content.format !== "text")) return undefined
    return nav.toggledIndices.size > 0 ? new Set<number>(nav.toggledIndices) : undefined
  }, [content, nav.toggledIndices])

  if (error) {
    return (
      <box style={{ flexDirection: "column" }}>
        <text content={`Error: ${error}`} fg={theme.error} />
      </box>
    )
  }

  if (!content) {
    return (
      <box>
        <text content="Loading..." fg={theme.textMuted} />
      </box>
    )
  }

  const cursorLine = nav.cursor?.line ?? undefined
  const selectionStart = nav.selection?.start.line ?? undefined
  const selectionEnd = nav.selection?.end.line ?? undefined
  const gutterConfig = config.view?.gutter

  const renderContent = () => {
    // Custom content: use registered renderer or fall back to text
    if (isCustomContent(content)) {
      const customRenderer = renderers?.[content.format]
      if (customRenderer) {
        return customRenderer({
          content,
          lineCount,
          cursor: cursorLine,
          selectionStart,
          selectionEnd,
        })
      }
      // No renderer for this custom format — fall back to text
      const text = getTextContent(content)
      return (
        <CodeView
          content={text}
          showLineNumbers={false}
          cursor={cursorLine}
          selectionStart={selectionStart}
          selectionEnd={selectionEnd}
        />
      )
    }

    // Built-in formats
    switch (content.format) {
      case "markdown":
        return (
          <MarkdownView
            content={content.markdown}
            activeBlock={cursorLine}
            selectedBlocks={
              selectionStart != null && selectionEnd != null
                ? { start: selectionStart, end: selectionEnd }
                : undefined
            }
            matchingBlocks={matchingBlocks}
            currentMatchBlock={currentMatchBlock}
            toggledBlocks={toggledBlocks}
          />
        )
      case "code":
        return (
          <CodeView
            content={content.code}
            language={content.language}
            showLineNumbers={gutterConfig ?? true}
            cursor={cursorLine}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            matchingLines={matchingLinesSet}
            currentMatchLine={currentMatchLine}
            toggledLines={toggledLines}
          />
        )
      case "text":
        return (
          <CodeView
            content={content.text}
            showLineNumbers={gutterConfig ?? false}
            cursor={cursorLine}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            matchingLines={matchingLinesSet}
            currentMatchLine={currentMatchLine}
            toggledLines={toggledLines}
          />
        )
      case "image":
        return <ImageView src={content.src} />
      case "table":
        return (
          <Table
            columns={content.columns}
            rows={content.rows}
            cursor={cursorLine}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            matchingRows={matchingRowsSet}
            currentMatchRow={currentMatchRow}
            toggledRows={toggledRows}
          />
        )
    }
  }

  const selectionCount =
    nav.selection != null ? nav.selection.end.line - nav.selection.start.line + 1 : 0
  const toggledCount = nav.toggledIndices.size
  const selectionItems =
    toggledCount > 0
      ? [{ label: "Selected:", value: String(toggledCount) }]
      : selectionCount > 0
        ? [{ label: "Selected:", value: String(selectionCount) }]
        : []

  const statusItems = [
    { label: "Theme:", value: themeName },
    { label: "Format:", value: content.format },
    ...(isBuiltinContent(content) && content.format === "table"
      ? [
          { label: "Rows:", value: String(content.rows.length) },
          { label: "Cols:", value: String(content.columns.length) },
        ]
      : [{ label: "Lines:", value: String(lineCount) }]),
    { label: "Mode:", value: nav.mode },
    { label: "Scroll:", value: String(nav.scrollOffset) },
    ...selectionItems,
    ...(streaming ? [{ label: "Status:", value: "streaming" }] : []),
    ...(nav.searchActive ? [{ label: "Search:", value: nav.searchQuery }] : []),
  ]

  return (
    <AppLayout
      titleBar={
        content.title
          ? { title: content.title, subtitle: content.format }
          : { title: content.format }
      }
      statusBar={{ items: statusItems }}
      scrollRef={scrollRef}
      scrollProps={{ focused: !nav.searchActive && !hasOverlay }}
      searchBar={{
        active: nav.searchActive,
        query: nav.searchQuery,
        onQueryChange: nav.setSearchQuery,
        onSubmit: nav.submitSearch,
        onCancel: () => {
          nav.setSearchQuery("")
        },
        matchCount: nav.matchingLines.length,
        currentMatch: nav.currentMatchIndex,
      }}
    >
      {renderContent()}
    </AppLayout>
  )
}
