import { useState, useEffect, useRef, useMemo } from "react"
import type { ScrollBoxRenderable } from "@opentui/core"
import { MarkdownView, CodeView, AppLayout, CommandPalette, ThemePicker, useTheme } from "@tooee/react"
import { useActions, useCommandContext } from "@tooee/commands"
import type { ActionDefinition } from "@tooee/commands"
import { useThemeCommands, useQuitCommand, useCopyCommand, useModalNavigationCommands, useCommandPalette } from "@tooee/shell"
import { useConfig } from "@tooee/config"
import { marked } from "marked"
import type { ViewContent, ViewContentProvider, ViewInteractionHandler } from "./types.ts"

interface ViewProps {
  contentProvider: ViewContentProvider
  interactionHandler?: ViewInteractionHandler
}

export function View({ contentProvider, interactionHandler }: ViewProps) {
  const { theme } = useTheme()
  const config = useConfig()
  const [content, setContent] = useState<ViewContent | null>(null)
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

  const lineCount = content?.body.split("\n").length ?? 0

  // For markdown: compute block count and block-to-line mapping
  const { blockCount, blockLineMap } = useMemo(() => {
    if (!content || content.format !== "markdown") return { blockCount: undefined, blockLineMap: undefined }
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
  }, [content])

  const nav = useModalNavigationCommands({
    totalLines: lineCount,
    getText: () => content?.body,
    blockCount,
    blockLineMap,
  })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = nav.scrollOffset
    }
  }, [nav.scrollOffset])

  const { name: themeName, picker: themePicker } = useThemeCommands()
  useQuitCommand()
  useCopyCommand({ getText: () => content?.body })

  const palette = useCommandPalette()
  const { invoke } = useCommandContext()

  const customActions: ActionDefinition[] | undefined = interactionHandler?.actions.map((action) => ({
    id: action.id,
    title: action.title,
    hotkey: action.hotkey,
    handler: () => {
      if (content) {
        action.handler(content)
      }
    },
  }))

  useActions(customActions)

  const matchingLinesSet = useMemo(
    () => (nav.matchingLines.length > 0 ? new Set(nav.matchingLines) : undefined),
    [nav.matchingLines],
  )
  const currentMatchLine = nav.matchingLines.length > 0 ? nav.matchingLines[nav.currentMatchIndex] : undefined

  // For markdown: convert matching lines to matching blocks
  const matchingBlocks = useMemo(() => {
    if (!matchingLinesSet || !blockLineMap || blockLineMap.length === 0) return undefined
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
  }, [matchingLinesSet, blockLineMap])

  const currentMatchBlock = useMemo(() => {
    if (currentMatchLine == null || !blockLineMap || blockLineMap.length === 0) return undefined
    for (let i = blockLineMap.length - 1; i >= 0; i--) {
      if (blockLineMap[i] <= currentMatchLine) return i
    }
    return 0
  }, [currentMatchLine, blockLineMap])

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
            selectedBlocks={selectionStart != null && selectionEnd != null ? { start: selectionStart, end: selectionEnd } : undefined}
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
    }
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
  ) : themePicker.isOpen ? (
    <ThemePicker
      entries={themePicker.entries}
      currentTheme={themeName}
      onSelect={themePicker.confirm}
      onClose={themePicker.close}
      onNavigate={themePicker.preview}
    />
  ) : undefined

  return (
    <AppLayout
      titleBar={content.title ? { title: content.title, subtitle: content.format } : { title: content.format }}
      statusBar={{
        items: [
          { label: "Theme:", value: themeName },
          { label: "Format:", value: content.format },
          { label: "Lines:", value: String(lineCount) },
          { label: "Mode:", value: nav.mode },
          { label: "Scroll:", value: String(nav.scrollOffset) },
          ...(nav.searchActive ? [{ label: "Search:", value: nav.searchQuery }] : []),
        ],
      }}
      scrollRef={scrollRef}
      scrollProps={{ focused: !nav.searchActive && !palette.isOpen && !themePicker.isOpen }}
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
      {renderContent()}
    </AppLayout>
  )
}
