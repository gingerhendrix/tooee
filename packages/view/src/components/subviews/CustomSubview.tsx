import { useEffect, useMemo, useRef } from "react"
import { CodeView, type RowDocumentRenderable } from "@tooee/renderers"
import { useTheme } from "@tooee/themes"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { useModalNavigationCommands } from "@tooee/shell"
import { getTextContent, type CustomContent, type ContentRenderer } from "../../types.js"
import { useContentMetrics } from "../../hooks/useContentMetrics.js"
import { identity, useMarkState } from "../../hooks/useMarkState.js"
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
  const { textContent, lineCount } = useContentMetrics(content)

  const nav = useModalNavigationCommands({
    totalLines: lineCount,
    getText: () => textContent,
    multiSelect: true,
  })

  useEffect(() => {
    if (nav.cursor) {
      docRef.current?.scrollToRow(nav.cursor.line, "nearest")
    }
  }, [nav.cursor])

  const { themeName } = useViewCommands({ content, textContent, actions })

  const markState = useMarkState({
    nav,
    theme,
    mapIndex: identity,
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
      nav.selection != null ? nav.selection.end.line - nav.selection.start.line + 1 : 0
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
    const cursorLine = nav.cursor?.line ?? undefined
    const selectionStart = nav.selection?.start.line ?? undefined
    const selectionEnd = nav.selection?.end.line ?? undefined

    return (
      <SubviewLayout content={content} nav={nav} streaming={streaming} themeName={themeName} extraStatusItems={extraStatusItems}>
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
    <SubviewLayout content={content} nav={nav} streaming={streaming} themeName={themeName} extraStatusItems={extraStatusItems}>
      <CodeView
        content={text}
        showLineNumbers={false}
        marks={markState}
        docRef={docRef}
      />
    </SubviewLayout>
  )
}
