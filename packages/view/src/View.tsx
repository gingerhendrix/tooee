import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { MarkdownView, CodeView, ImageView, Table, type RowDocumentRenderable } from "@tooee/renderers"
import { AppLayout } from "@tooee/layout"
import { useTheme } from "@tooee/themes"
import { useActions, useProvideCommandContext } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import {
  useThemeCommands,
  useQuitCommand,
  useCopyCommand,
  useToggleLineNumbersCommand,
  useModalNavigationCommands,
  useCommandPalette,
} from "@tooee/shell"
import { useConfig } from "@tooee/config"
import { MarkSetBuilder, createMarkState, MarkPriorities } from "@tooee/marks"
import type { MarkSet, MarkState } from "@tooee/marks"
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
  const docRef = useRef<RowDocumentRenderable>(null)
  const [reloadTrigger, setReloadTrigger] = useState(0)
  const reload = useCallback(() => setReloadTrigger((n) => n + 1), [])

  // Provider marks: static from contentProvider.marks + streamed via marks chunks
  const [providerMarks, setProviderMarks] = useState<MarkSet[]>([])
  // User marks: set via useMarks / CommandContext (Phase 5)
  const [userMarks, setUserMarks] = useState<MarkSet[]>([])

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

  const TABLE_SEARCH_HEADER_OFFSET = 1

  const textContent = useMemo(() => (content ? getTextContent(content) : ""), [content])

  const lineCount = useMemo(() => {
    if (!content) return 0
    if (isBuiltinContent(content) && content.format === "table") {
      return content.rows.length
    }
    return textContent.split("\n").length
  }, [content, textContent])

  const { blockCount, blockLineMap } = useMemo(() => {
    if (!content) return { blockCount: undefined, blockLineMap: undefined }
    if (!isBuiltinContent(content)) return { blockCount: undefined, blockLineMap: undefined }

    if (content.format === "table") {
      const map = content.rows.map((_: unknown, i: number) => i)
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
    if (nav.cursor) {
      docRef.current?.scrollToRow(nav.cursor.line, "nearest")
    }
  }, [nav.cursor])

  const [showLineNumbers, setShowLineNumbers] = useState(config.view?.gutter ?? true)

  const { name: themeName } = useThemeCommands()
  useQuitCommand()
  useCopyCommand({
    getText: () => (content ? textContent : undefined),
  })
  useToggleLineNumbersCommand({
    showLineNumbers,
    onToggle: () => setShowLineNumbers((v) => !v),
  })

  const _palette = useCommandPalette()

  useActions(actions)

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

  // Phase 5: mark manipulation callbacks for action handlers
  const setMarkSet = useCallback((set: MarkSet) => {
    setUserMarks((prev) => {
      const filtered = prev.filter((s) => s.namespace !== set.namespace)
      return [...filtered, set]
    })
  }, [])

  const clearMarkNamespace = useCallback((namespace: string) => {
    setUserMarks((prev) => prev.filter((s) => s.namespace !== namespace))
  }, [])

  const clearAllUserMarks = useCallback(() => {
    setUserMarks([])
  }, [])

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
      // Phase 5: marks API for action handlers
      marks: {
        setMarkSet,
        clearNamespace: clearMarkNamespace,
        clearAll: clearAllUserMarks,
        userMarks,
        providerMarks,
      },
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

  // Build MarkState from nav state for markdown format (block-based)
  const markdownMarkState = useMemo(() => {
    if (!content || content.format !== "markdown") return undefined

    const sets = []

    if (matchingBlocks && matchingBlocks.size > 0) {
      const builder = new MarkSetBuilder()
      for (const block of matchingBlocks) {
        builder.addLine(block, {
          background: theme.warning,
          signBefore: "●",
          foreground: theme.warning,
        })
      }
      sets.push(builder.build("search", MarkPriorities.SEARCH_MATCH))
    }

    if (toggledBlocks && toggledBlocks.size > 0) {
      const builder = new MarkSetBuilder()
      for (const block of toggledBlocks) {
        builder.addLine(block, { background: theme.backgroundPanel })
      }
      sets.push(builder.build("toggled", MarkPriorities.TOGGLED))
    }

    if (nav.selection) {
      const builder = new MarkSetBuilder()
      builder.addRange(
        { line: nav.selection.start.line },
        { line: nav.selection.end.line },
        { background: theme.selection },
      )
      sets.push(builder.build("selection", MarkPriorities.SELECTION))
    }

    if (currentMatchBlock != null) {
      const builder = new MarkSetBuilder()
      builder.addLine(currentMatchBlock, {
        background: theme.primary,
        signBefore: "●",
        foreground: theme.primary,
      })
      sets.push(builder.build("currentMatch", MarkPriorities.CURRENT_MATCH))
    }

    if (nav.cursor) {
      const builder = new MarkSetBuilder()
      builder.addLine(nav.cursor.line, {
        background: theme.cursorLine,
        signBefore: "▸",
        foreground: theme.primary,
      })
      sets.push(builder.build("cursor", MarkPriorities.CURSOR))
    }

    // Merge provider and user marks (nav marks take priority via higher priorities)
    sets.push(...providerMarks, ...userMarks)

    return sets.length > 0 ? createMarkState(sets) : undefined
  }, [content, matchingBlocks, toggledBlocks, currentMatchBlock, nav.cursor, nav.selection, theme, providerMarks, userMarks])

  // Build MarkState from nav state for table format (row-based)
  const tableMarkState = useMemo(() => {
    if (!content || content.format !== "table") return undefined

    const sets = []

    if (matchingRowsSet && matchingRowsSet.size > 0) {
      const builder = new MarkSetBuilder()
      for (const row of matchingRowsSet) {
        builder.addLine(row, {
          background: theme.warning,
          signBefore: "●",
          foreground: theme.warning,
        })
      }
      sets.push(builder.build("search", MarkPriorities.SEARCH_MATCH))
    }

    if (toggledRows && toggledRows.size > 0) {
      const builder = new MarkSetBuilder()
      for (const row of toggledRows) {
        builder.addLine(row, { background: theme.backgroundPanel })
      }
      sets.push(builder.build("toggled", MarkPriorities.TOGGLED))
    }

    if (nav.selection) {
      const builder = new MarkSetBuilder()
      builder.addRange(
        { line: nav.selection.start.line },
        { line: nav.selection.end.line },
        { background: theme.selection },
      )
      sets.push(builder.build("selection", MarkPriorities.SELECTION))
    }

    if (currentMatchRow != null) {
      const builder = new MarkSetBuilder()
      builder.addLine(currentMatchRow, {
        background: theme.primary,
        signBefore: "●",
        foreground: theme.primary,
      })
      sets.push(builder.build("currentMatch", MarkPriorities.CURRENT_MATCH))
    }

    if (nav.cursor) {
      const builder = new MarkSetBuilder()
      builder.addLine(nav.cursor.line, {
        background: theme.cursorLine,
        signBefore: "▸",
        foreground: theme.primary,
      })
      sets.push(builder.build("cursor", MarkPriorities.CURSOR))
    }

    // Merge provider and user marks
    sets.push(...providerMarks, ...userMarks)

    return sets.length > 0 ? createMarkState(sets) : undefined
  }, [content, matchingRowsSet, toggledRows, currentMatchRow, nav.cursor, nav.selection, theme, providerMarks, userMarks])

  // Build MarkState from nav state for code/text formats
  const codeMarkState = useMemo(() => {
    if (!content || (content.format !== "code" && content.format !== "text")) return undefined

    const sets = []

    if (nav.matchingLines.length > 0) {
      const builder = new MarkSetBuilder()
      for (const line of nav.matchingLines) {
        builder.addLine(line, {
          background: theme.warning,
          signBefore: "●",
          foreground: theme.warning,
        })
      }
      sets.push(builder.build("search", MarkPriorities.SEARCH_MATCH))
    }

    if (nav.toggledIndices.size > 0) {
      const builder = new MarkSetBuilder()
      for (const line of nav.toggledIndices) {
        builder.addLine(line, { background: theme.backgroundPanel })
      }
      sets.push(builder.build("toggled", MarkPriorities.TOGGLED))
    }

    if (nav.selection) {
      const builder = new MarkSetBuilder()
      builder.addRange(
        { line: nav.selection.start.line },
        { line: nav.selection.end.line },
        { background: theme.selection },
      )
      sets.push(builder.build("selection", MarkPriorities.SELECTION))
    }

    if (nav.matchingLines.length > 0) {
      const currentLine = nav.matchingLines[nav.currentMatchIndex]
      if (currentLine != null) {
        const builder = new MarkSetBuilder()
        builder.addLine(currentLine, {
          background: theme.primary,
          signBefore: "●",
          foreground: theme.primary,
        })
        sets.push(builder.build("currentMatch", MarkPriorities.CURRENT_MATCH))
      }
    }

    if (nav.cursor) {
      const builder = new MarkSetBuilder()
      builder.addLine(nav.cursor.line, {
        background: theme.cursorLine,
        signBefore: "▸",
        foreground: theme.primary,
      })
      sets.push(builder.build("cursor", MarkPriorities.CURSOR))
    }

    // Merge provider and user marks
    sets.push(...providerMarks, ...userMarks)

    return sets.length > 0 ? createMarkState(sets) : undefined
  }, [content, nav.cursor, nav.selection, nav.matchingLines, nav.currentMatchIndex, nav.toggledIndices, theme, providerMarks, userMarks])

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
  const renderContent = () => {
    // Custom content: use registered renderer or fall back to text
    if (isCustomContent(content)) {
      const customRenderer = renderers?.[content.format]
      if (customRenderer) {
        // Build a MarkState for custom renderers from provider + user marks
        const customSets = [...providerMarks, ...userMarks]
        const customMarks = customSets.length > 0 ? createMarkState(customSets) : undefined
        return customRenderer({
          content,
          lineCount,
          cursor: cursorLine,
          selectionStart,
          selectionEnd,
          marks: customMarks,
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
          docRef={docRef}
        />
      )
    }

    // Built-in formats
    switch (content.format) {
      case "markdown":
        return (
          <MarkdownView
            content={content.markdown}
            showLineNumbers={showLineNumbers}
            marks={markdownMarkState}
            docRef={docRef}
          />
        )
      case "code":
        return (
          <CodeView
            content={content.code}
            language={content.language}
            showLineNumbers={showLineNumbers}
            marks={codeMarkState}
            docRef={docRef}
          />
        )
      case "text":
        return (
          <CodeView
            content={content.text}
            showLineNumbers={showLineNumbers}
            marks={codeMarkState}
            docRef={docRef}
          />
        )
      case "image":
        return <ImageView src={content.src} />
      case "table":
        return (
          <Table
            columns={content.columns}
            rows={content.rows}
            showLineNumbers={showLineNumbers}
            marks={tableMarkState}
            docRef={docRef}
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
    { label: "Cursor:", value: nav.cursor ? String(nav.cursor.line) : "-" },
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
