import { useEffect, useMemo, useRef } from "react"
import { marked } from "marked"
import { MarkdownView, flattenTokens, type RowDocumentRenderable } from "@tooee/renderers"
import { useTheme } from "@tooee/themes"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { useCopy, useNavigation } from "@tooee/shell"
import { useSearch } from "@tooee/search"
import type { MarkdownContent } from "../../types.js"
import { useMarkState } from "../../hooks/useMarkState.js"
import { useViewCommands } from "../../hooks/useViewCommands.js"
import { SubviewLayout } from "../SubviewLayout.js"
import type { SubviewProps } from "./types.js"

interface MarkdownSubviewProps extends SubviewProps {
  content: MarkdownContent
}

export function MarkdownSubview({
  content,
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
    const selectionCount =
      nav.selection != null ? nav.selection.end - nav.selection.start + 1 : 0
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
      />
    </SubviewLayout>
  )
}
