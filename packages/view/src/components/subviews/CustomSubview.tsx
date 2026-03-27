import { useEffect, useRef } from "react"
import { CodeView, type RowDocumentRenderable } from "@tooee/renderers"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { useModalNavigationCommands } from "@tooee/shell"
import { createMarkState } from "@tooee/marks"
import { getTextContent, type CustomContent, type ContentRenderer } from "../../types.js"
import { useContentMetrics } from "../../hooks/useContentMetrics.js"
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

  const customRenderer = renderers?.[content.format]
  if (customRenderer) {
    const customSets = [...providerMarks, ...userMarks]
    const customMarks = customSets.length > 0 ? createMarkState(customSets) : undefined
    const cursorLine = nav.cursor?.line ?? undefined
    const selectionStart = nav.selection?.start.line ?? undefined
    const selectionEnd = nav.selection?.end.line ?? undefined

    return (
      <SubviewLayout content={content} nav={nav} streaming={streaming} themeName={themeName}>
        {customRenderer({
          content,
          lineCount,
          cursor: cursorLine,
          selectionStart,
          selectionEnd,
          marks: customMarks,
        })}
      </SubviewLayout>
    )
  }

  // No renderer for this custom format -- fall back to text
  const text = getTextContent(content)
  return (
    <SubviewLayout content={content} nav={nav} streaming={streaming} themeName={themeName}>
      <CodeView
        content={text}
        showLineNumbers={false}
        cursor={nav.cursor?.line}
        selectionStart={nav.selection?.start.line}
        selectionEnd={nav.selection?.end.line}
        docRef={docRef}
      />
    </SubviewLayout>
  )
}
