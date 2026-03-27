import { useEffect, useRef } from "react"
import { CodeView, type RowDocumentRenderable } from "@tooee/renderers"
import { useTheme } from "@tooee/themes"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { useModalNavigationCommands } from "@tooee/shell"
import type { CodeContent, TextContent } from "../../types.js"
import { useContentMetrics } from "../../hooks/useContentMetrics.js"
import { useMarkState, identity } from "../../hooks/useMarkState.js"
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

  const { themeName, showLineNumbers } = useViewCommands({ content, textContent, actions })

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

  const text = content.format === "code" ? content.code : content.text

  return (
    <SubviewLayout content={content} nav={nav} streaming={streaming} themeName={themeName}>
      <CodeView
        content={text}
        language={content.format === "code" ? content.language : undefined}
        showLineNumbers={showLineNumbers}
        marks={markState}
        docRef={docRef}
      />
    </SubviewLayout>
  )
}
