import { useCallback, useEffect, useMemo, useRef } from "react"
import { marked } from "marked"
import type { TextBufferRenderable } from "@opentui/core"
import {
  MarkdownView,
  flattenTokens,
  type CodeBlockRenderer,
  type RowDocumentRenderable,
} from "@tooee/renderers"
import { useTheme } from "@tooee/themes"
import { useCommand, useCommandContext } from "@tooee/commands"
import { useHasModalOverlay } from "@tooee/overlays"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { actionsToContextMenuEntries, useContextMenu, useCopy, useNavigation } from "@tooee/shell"
import { useSearch } from "@tooee/search"
import type { MarkdownContent } from "../../types.js"
import { useMarkState } from "../../hooks/useMarkState.js"
import { useViewCommands } from "../../hooks/useViewCommands.js"
import { SubviewLayout } from "../SubviewLayout.js"
import type { SubviewProps } from "./types.js"

interface MarkdownSubviewProps extends SubviewProps {
  content: MarkdownContent
  codeBlockRenderers?: Record<string, CodeBlockRenderer>
}

/** Columns moved per h/l press when scrolling a wide block horizontally. */
const BLOCK_HSCROLL_STEP = 4

export function MarkdownSubview({
  content,
  codeBlockRenderers,
  providerMarks,
  userMarks,
  setMarkSet,
  clearMarkNamespace,
  clearAllUserMarks,
  reload,
  streaming,
  actions,
}: MarkdownSubviewProps) {
  const { theme } = useTheme()
  const docRef = useRef<RowDocumentRenderable>(null)
  const hasModalOverlay = useHasModalOverlay()
  const contextMenu = useContextMenu()
  const { invoke } = useCommandContext()
  const textContent = content.markdown
  const lineCount = useMemo(() => textContent.split("\n").length, [textContent])
  const blocks = useMemo(() => flattenTokens(marked.lexer(content.markdown)), [content.markdown])

  const nav = useNavigation({
    rowCount: blocks.length,
    multiSelect: true,
  })
  const search = useSearch({
    match: (query) => {
      const lowerQuery = query.toLowerCase()
      return blocks.flatMap((block, index) => {
        const { token } = block
        const raw = "raw" in token && typeof token.raw === "string" ? token.raw : ""
        return raw.toLowerCase().includes(lowerQuery) ? [index] : []
      })
    },
    onJump: nav.setCursor,
  })
  useCopy({
    getRowText: (index) => {
      const block = blocks[index]
      if (!block) return ""
      const { token } = block
      return "raw" in token && typeof token.raw === "string" ? token.raw : ""
    },
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

  // Horizontal panning for wide blocks (mermaid diagrams and code blocks).
  // Blocks that can overflow horizontally register their text-buffer
  // renderable by block index; h/l in cursor mode pans the block under the
  // nav cursor via `scrollX` (the setter clamps to the content width).
  const hScrollableBlocksRef = useRef<Map<number, TextBufferRenderable>>(new Map())
  const cursorScrollable = () =>
    nav.cursor !== null ? hScrollableBlocksRef.current.get(nav.cursor) : undefined
  useCommand({
    id: "block-scroll-left",
    title: "Scroll block left",
    hotkey: "h",
    modes: ["cursor"],
    when: () => cursorScrollable() != null,
    handler: () => {
      const target = cursorScrollable()
      if (target) target.scrollX -= BLOCK_HSCROLL_STEP
    },
  })
  useCommand({
    id: "block-scroll-right",
    title: "Scroll block right",
    hotkey: "l",
    modes: ["cursor"],
    when: () => cursorScrollable() != null,
    handler: () => {
      const target = cursorScrollable()
      if (target) target.scrollX += BLOCK_HSCROLL_STEP
    },
  })

  const menuEntries = useMemo(() => actionsToContextMenuEntries(actions), [actions])

  // Left-click selects the clicked block; right-click selects it and opens the
  // same app-provided action menu as table/code rows. Both stand down while a
  // modal overlay is up (theme picker, command palette, Ask/Choose), matching
  // keyboard stand-down semantics.
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
      <MarkdownView
        content={content.markdown}
        showLineNumbers={showLineNumbers}
        marks={markState}
        docRef={docRef}
        hScrollableBlocksRef={hScrollableBlocksRef}
        codeBlockRenderers={codeBlockRenderers}
        onRowClick={handleRowClick}
        onRowContextMenu={handleRowContextMenu}
      />
    </SubviewLayout>
  )
}
