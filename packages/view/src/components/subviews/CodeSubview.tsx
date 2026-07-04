import { useCallback, useEffect, useMemo, useRef } from "react"
import { CodeView, type RowDocumentRenderable } from "@tooee/renderers"
import { useTheme } from "@tooee/themes"
import { useCommandContext } from "@tooee/commands"
import { useHasModalOverlay } from "@tooee/overlays"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { actionsToContextMenuEntries, useContextMenu, useCopy, useNavigation } from "@tooee/shell"
import { findMatchingLines, useSearch } from "@tooee/search"
import type { CodeContent, TextContent } from "../../types.js"
import { useMarkState } from "../../hooks/useMarkState.js"
import { useViewCommands } from "../../hooks/useViewCommands.js"
import { SubviewLayout } from "../SubviewLayout.js"
import type { SubviewProps } from "./types.js"

interface CodeSubviewProps extends SubviewProps {
  content: CodeContent | TextContent
}

export function CodeSubview({
  content,
  providerMarks,
  userMarks,
  setMarkSet,
  clearMarkNamespace,
  clearAllUserMarks,
  reload,
  streaming,
  actions,
}: CodeSubviewProps) {
  const { theme } = useTheme()
  const docRef = useRef<RowDocumentRenderable>(null)
  const hasModalOverlay = useHasModalOverlay()
  const contextMenu = useContextMenu()
  const { invoke } = useCommandContext()
  const textContent = content.format === "code" ? content.code : content.text
  const lines = useMemo(() => textContent.split("\n"), [textContent])
  const lineCount = lines.length

  const nav = useNavigation({
    rowCount: lineCount,
    multiSelect: true,
  })
  const search = useSearch({
    match: (query) => findMatchingLines(textContent, query),
    onJump: nav.setCursor,
  })
  useCopy({
    getRowText: (index) => lines[index] ?? "",
    cursor: nav.cursor,
    selection: nav.selection,
    toggledIndices: nav.toggledIndices,
  })
  const layoutNav = { ...nav, ...search }

  useEffect(() => {
    if (nav.cursor !== null) {
      docRef.current?.scrollToRow(nav.cursor, "nearest")
    }
  }, [nav.cursor])

  const { themeName, showLineNumbers } = useViewCommands({ content, textContent, actions })

  const markState = useMarkState({
    nav,
    search,
    theme,
    providerMarks,
    userMarks,
  })

  useViewCommandContext({
    content,
    nav,
    reload,
    providerMarks,
    userMarks,
    setMarkSet,
    clearMarkNamespace,
    clearAllUserMarks,
  })

  const text = content.format === "code" ? content.code : content.text

  const menuEntries = useMemo(() => actionsToContextMenuEntries(actions), [actions])

  // Left-click selects the clicked line; right-click selects it and opens the
  // same app-provided action menu as table rows. Both stand down while a modal
  // overlay is up (theme picker, command palette, Ask/Choose), matching the
  // keyboard stand-down and avoiding covered-app mutations.
  const setCursor = nav.setCursor
  const openContextMenu = contextMenu.open
  const handleRowClick = useCallback(
    (index: number) => {
      if (hasModalOverlay) return
      setCursor(index)
    },
    [hasModalOverlay, setCursor],
  )
  const handleRowContextMenu = useCallback(
    (index: number, x: number, y: number) => {
      if (hasModalOverlay) return
      setCursor(index)
      openContextMenu(x, y, menuEntries, invoke)
    },
    [hasModalOverlay, setCursor, openContextMenu, menuEntries, invoke],
  )

  const extraStatusItems = useMemo(() => {
    const selectionCount = nav.selection != null ? nav.selection.end - nav.selection.start + 1 : 0
    const toggledCount = nav.toggledIndices.size
    const selectionItems =
      toggledCount > 0
        ? [{ label: "Selected:", value: String(toggledCount) }]
        : selectionCount > 0
          ? [{ label: "Selected:", value: String(selectionCount) }]
          : []
    return [
      { label: "Format:", value: content.format },
      { label: "Lines:", value: String(lineCount) },
      ...selectionItems,
    ]
  }, [content.format, lineCount, nav.selection, nav.toggledIndices])

  return (
    <SubviewLayout
      content={content}
      nav={layoutNav}
      streaming={streaming}
      themeName={themeName}
      extraStatusItems={extraStatusItems}
    >
      <CodeView
        content={text}
        language={content.format === "code" ? content.language : undefined}
        showLineNumbers={showLineNumbers}
        marks={markState}
        docRef={docRef}
        onRowClick={handleRowClick}
        onRowContextMenu={handleRowContextMenu}
      />
    </SubviewLayout>
  )
}
