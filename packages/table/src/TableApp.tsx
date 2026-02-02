import { useState, useEffect, useRef } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { AppLayout, CommandPalette, Table, useTheme } from "@tooee/react"
import { useThemeCommands, useQuitCommand, useCopyCommand, useModalNavigationCommands, useCommandPalette } from "@tooee/shell"
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

  const nav = useModalNavigationCommands({
    totalLines: lineCount,
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
      <Table headers={content.headers} rows={content.rows} />
    </AppLayout>
  )
}
