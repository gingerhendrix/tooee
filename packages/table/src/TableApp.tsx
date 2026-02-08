import { useState, useEffect, useRef, useMemo } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { AppLayout, CommandPalette, Table, useTheme } from "@tooee/react"
import {
  useThemeCommands,
  useQuitCommand,
  useCopyCommand,
  useModalNavigationCommands,
  useCommandPalette,
} from "@tooee/shell"
import { useCommandContext } from "@tooee/commands"
import type { TableContent, TableContentProvider } from "./types.ts"

interface TableAppProps {
  contentProvider: TableContentProvider
}

export function TableApp({ contentProvider }: TableAppProps) {
  const { theme } = useTheme()
  const [content, setContent] = useState<TableContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<ScrollBoxRenderable>(null)

  useEffect(() => {
    const result = contentProvider.load()
    if (result instanceof Promise) {
      result.then(setContent).catch((e: Error) => setError(e.message))
    } else {
      setContent(result)
    }
  }, [contentProvider])

  const lineCount = content ? content.rows.length + 3 : 0 // header + borders + rows
  const rowCount = content ? content.rows.length : 0

  // Visual line offset: lines 0-2 are border/header/separator, data starts at line 3
  const VISUAL_HEADER_OFFSET = 3
  // Search text offset: getText() has header at line 0, data rows start at line 1
  const SEARCH_HEADER_OFFSET = 1

  // Build a blockLineMap so cursor mode operates on data rows only
  // Each "block" is a data row, blockLineMap[i] gives the visual line number for row i
  const blockLineMap = useMemo(() => {
    if (!content) return []
    return content.rows.map((_, i) => i + VISUAL_HEADER_OFFSET)
  }, [content])

  const nav = useModalNavigationCommands({
    totalLines: lineCount,
    blockCount: rowCount,
    blockLineMap,
    searchLineOffset: SEARCH_HEADER_OFFSET,
    getText: () => {
      if (!content) return undefined
      const headerLine = content.headers.join("\t")
      const rowLines = content.rows.map((row) => row.join("\t"))
      return [headerLine, ...rowLines].join("\n")
    },
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
      const headerLine = content.headers.join("\t")
      const rowLines = content.rows.map((row) => row.join("\t"))
      return [headerLine, ...rowLines].join("\n")
    },
  })

  const palette = useCommandPalette()
  const { invoke } = useCommandContext()

  // With blockCount/blockLineMap, cursor.line is already the row index (0-based)
  const cursorRow = nav.cursor?.line
  const selectionStartRow = nav.selection?.start.line
  const selectionEndRow = nav.selection?.end.line

  // Search matches are returned as line numbers in the search text, convert to row indices
  const matchingRowsSet = useMemo(() => {
    if (nav.matchingLines.length === 0) return undefined
    const rows = new Set<number>()
    for (const line of nav.matchingLines) {
      const row = line - SEARCH_HEADER_OFFSET
      if (row >= 0) rows.add(row)
    }
    return rows.size > 0 ? rows : undefined
  }, [nav.matchingLines])

  const currentMatchRow =
    nav.matchingLines.length > 0
      ? nav.matchingLines[nav.currentMatchIndex] - SEARCH_HEADER_OFFSET
      : undefined

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

  const paletteOverlay = palette.isOpen ? (
    <CommandPalette
      commands={palette.entries}
      onSelect={(id) => {
        palette.close()
        invoke(id)
      }}
      onClose={palette.close}
    />
  ) : undefined

  return (
    <AppLayout
      titleBar={{ title: content.title ?? "Table", subtitle: content.format }}
      statusBar={{
        items: [
          { label: "Theme:", value: themeName },
          { label: "Format:", value: content.format },
          { label: "Rows:", value: String(content.rows.length) },
          { label: "Cols:", value: String(content.headers.length) },
          { label: "Mode:", value: nav.mode },
          ...(nav.searchActive ? [{ label: "Search:", value: nav.searchQuery }] : []),
        ],
      }}
      scrollRef={scrollRef}
      scrollProps={{ focused: !nav.searchActive && !palette.isOpen }}
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
      overlay={paletteOverlay}
    >
      <Table
        headers={content.headers}
        rows={content.rows}
        cursor={cursorRow}
        selectionStart={selectionStartRow}
        selectionEnd={selectionEndRow}
        matchingRows={matchingRowsSet}
        currentMatchRow={
          currentMatchRow != null && currentMatchRow >= 0 ? currentMatchRow : undefined
        }
      />
    </AppLayout>
  )
}
