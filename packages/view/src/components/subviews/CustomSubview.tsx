import { useEffect, useMemo, useRef } from "react"
import { CodeView, type RowDocumentRenderable } from "@tooee/renderers"
import { useTheme } from "@tooee/themes"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { useCopy, useNavigation } from "@tooee/shell"
import { findMatchingLines, useSearch } from "@tooee/search"
import { getTextContent, type CustomContent, type ContentRenderer } from "../../types.js"
import { useMarkState } from "../../hooks/useMarkState.js"
import { useViewCommands } from "../../hooks/useViewCommands.js"
import { SubviewLayout } from "../SubviewLayout.js"
import type { SubviewProps } from "./types.js"

interface CustomSubviewProps extends SubviewProps {
  content: CustomContent
  renderers?: Record<string, ContentRenderer>
}

export function CustomSubview({
  content,
  providerMarks,
  userMarks,
  setMarkSet,
  clearMarkNamespace,
  clearAllUserMarks,
  reload,
  streaming,
  actions,
  renderers,
}: CustomSubviewProps) {
  const { theme } = useTheme()
  const docRef = useRef<RowDocumentRenderable>(null)
  const textContent = useMemo(() => getTextContent(content), [content])
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

  const { themeName } = useViewCommands({ content, textContent, actions })

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

  const customRenderer = renderers?.[content.format]
  if (customRenderer) {
    const cursorLine = nav.cursor ?? undefined
    const selectionStart = nav.selection?.start ?? undefined
    const selectionEnd = nav.selection?.end ?? undefined

    return (
      <SubviewLayout
        content={content}
        nav={layoutNav}
        streaming={streaming}
        themeName={themeName}
        extraStatusItems={extraStatusItems}
      >
        {customRenderer({
          content,
          lineCount,
          cursor: cursorLine,
          selectionStart,
          selectionEnd,
          marks: markState,
        })}
      </SubviewLayout>
    )
  }

  // No renderer for this custom format -- fall back to text
  const text = getTextContent(content)
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
        showLineNumbers={false}
        marks={markState}
        docRef={docRef}
      />
    </SubviewLayout>
  )
}
