import { useState, useEffect, useRef, useMemo } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { MarkdownView, CodeView, ImageView, Table, parseAuto } from "@tooee/renderers"
import type { TableContent } from "@tooee/renderers"
import { AppLayout } from "@tooee/layout"
import { useTheme } from "@tooee/themes"
import { useHasOverlay } from "@tooee/overlays"
import { useActions } from "@tooee/commands"
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
import type { Content, ContentProvider, ContentChunk, ViewInteractionHandler } from "./types.ts"

interface ViewProps {
  contentProvider: ContentProvider
  actions?: ActionDefinition[]
  /** @deprecated Use actions instead */
  interactionHandler?: ViewInteractionHandler
}

function isAsyncIterable(value: unknown): value is AsyncIterable<ContentChunk> {
  return value != null && typeof value === "object" && Symbol.asyncIterator in value
}

export function View({ contentProvider, actions, interactionHandler }: ViewProps) {
  const { theme } = useTheme()
  const config = useConfig()
  const [content, setContent] = useState<Content | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  useEffect(() => {
    const result = contentProvider.load()

    if (isAsyncIterable(result)) {
      const format = contentProvider.format ?? "markdown"
      const title = contentProvider.title
      setContent({ body: "", format, title })
      setStreaming(true)
      let body = ""
      ;(async () => {
        try {
          for await (const chunk of result) {
            if (chunk.type === "append") {
              body += chunk.data
            } else {
              body = chunk.data
            }
            setContent((prev) => (prev ? { ...prev, body } : { body, format, title }))
          }
        } finally {
          setStreaming(false)
        }
      })()
      return
    }

    if (result instanceof Promise) {
      result.then(setContent).catch((e: Error) => setError(e.message))
      return
    }

    setContent(result)
  }, [contentProvider])

  // Parse table content when format is "table"
  const tableData = useMemo<TableContent | null>(() => {
    if (!content || content.format !== "table") return null
    return parseAuto(content.body)
  }, [content])

  // Visual line offset for table: lines 0-2 are border/header/separator, data starts at line 3
  const TABLE_VISUAL_HEADER_OFFSET = 3
  // Search text offset: getText() has header at line 0, data rows start at line 1
  const TABLE_SEARCH_HEADER_OFFSET = 1

  const lineCount = useMemo(() => {
    if (!content) return 0
    if (content.format === "table" && tableData) {
      return tableData.rows.length + 3 // header + borders + rows
    }
    return content.body.split("\n").length
  }, [content, tableData])

  // For markdown: compute block count and block-to-line mapping
  // For table: each row is a block
  const { blockCount, blockLineMap } = useMemo(() => {
    if (!content) return { blockCount: undefined, blockLineMap: undefined }

    if (content.format === "table" && tableData) {
      const map = tableData.rows.map((_, i) => i + TABLE_VISUAL_HEADER_OFFSET)
      return { blockCount: tableData.rows.length, blockLineMap: map }
    }

    if (content.format !== "markdown")
      return { blockCount: undefined, blockLineMap: undefined }

    const tokens = marked.lexer(content.body)
    const blocks = tokens.filter((t) => t.type !== "space")
    const lineMap: number[] = []
    let lineOffset = 0
    for (const token of tokens) {
      if (token.type === "space") {
        // Count lines in space tokens
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
  }, [content, tableData])

  const nav = useModalNavigationCommands({
    totalLines: lineCount,
    getText: () => {
      if (!content) return undefined
      if (content.format === "table" && tableData) {
        const headerLine = tableData.headers.join("\t")
        const rowLines = tableData.rows.map((row) => row.join("\t"))
        return [headerLine, ...rowLines].join("\n")
      }
      return content.body
    },
    blockCount,
    blockLineMap,
    searchLineOffset: content?.format === "table" ? TABLE_SEARCH_HEADER_OFFSET : 0,
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = nav.scrollOffset
    }
  }, [nav.scrollOffset])

  const { name: themeName } = useThemeCommands()
  useQuitCommand()
  useCopyCommand({
    getText: () => {
      if (!content) return undefined
      if (content.format === "table" && tableData) {
        const headerLine = tableData.headers.join("\t")
        const rowLines = tableData.rows.map((row) => row.join("\t"))
        return [headerLine, ...rowLines].join("\n")
      }
      return content.body
    },
  })

  const _palette = useCommandPalette()

  const legacyActions: ActionDefinition[] | undefined = interactionHandler?.actions.map(
    (action) => ({
      id: action.id,
      title: action.title,
      hotkey: action.hotkey,
      handler: () => {
        if (content) {
          action.handler(content)
        }
      },
    }),
  )

  useActions(actions ?? legacyActions)

  const matchingLinesSet = useMemo(
    () => (nav.matchingLines.length > 0 ? new Set(nav.matchingLines) : undefined),
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
    switch (content.format) {
      case "markdown":
        return (
          <MarkdownView
            content={content.body}
            activeBlock={cursorLine}
            selectedBlocks={
              selectionStart != null && selectionEnd != null
                ? { start: selectionStart, end: selectionEnd }
                : undefined
            }
            matchingBlocks={matchingBlocks}
            currentMatchBlock={currentMatchBlock}
          />
        )
      case "code":
        return (
          <CodeView
            content={content.body}
            language={content.language}
            showLineNumbers={gutterConfig ?? true}
            cursor={cursorLine}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            matchingLines={matchingLinesSet}
            currentMatchLine={currentMatchLine}
          />
        )
      case "text":
        return (
          <CodeView
            content={content.body}
            showLineNumbers={gutterConfig ?? false}
            cursor={cursorLine}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            matchingLines={matchingLinesSet}
            currentMatchLine={currentMatchLine}
          />
        )
      case "image":
        return <ImageView src={content.body} />
      case "table":
        if (!tableData) return null
        return (
          <Table
            headers={tableData.headers}
            rows={tableData.rows}
            cursor={cursorLine}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            matchingRows={matchingRowsSet}
            currentMatchRow={currentMatchRow}
          />
        )
    }
  }

  const hasOverlay = useHasOverlay()

  const statusItems = [
    { label: "Theme:", value: themeName },
    { label: "Format:", value: content.format },
    ...(content.format === "table" && tableData
      ? [
          { label: "Rows:", value: String(tableData.rows.length) },
          { label: "Cols:", value: String(tableData.headers.length) },
        ]
      : [{ label: "Lines:", value: String(lineCount) }]),
    { label: "Mode:", value: nav.mode },
    { label: "Scroll:", value: String(nav.scrollOffset) },
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
