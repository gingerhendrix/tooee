import { useEffect, useMemo, useRef } from "react"
import { MarkdownView, type RowDocumentRenderable } from "@tooee/renderers"
import { useTheme } from "@tooee/themes"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { useModalNavigationCommands } from "@tooee/shell"
import type { MarkdownContent } from "../../types.js"
import { useContentMetrics } from "../../hooks/useContentMetrics.js"
import { useMarkState, blockMapper } from "../../hooks/useMarkState.js"
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

  const { textContent, lineCount, blockCount, blockLineMap } = useContentMetrics(content)

  const nav = useModalNavigationCommands({
    totalLines: lineCount,
    getText: () => textContent,
    blockCount,
    blockLineMap,
    multiSelect: true,
  })

  useEffect(() => {
    if (nav.cursor) {
      docRef.current?.scrollToRow(nav.cursor.line, "nearest")
    }
  }, [nav.cursor])

  const { themeName, showLineNumbers } = useViewCommands({ content, textContent, actions })

  const mapIndex = useMemo(
    () => (blockLineMap ? blockMapper(blockLineMap) : (line: number) => line),
    [blockLineMap],
  )

  const markState = useMarkState({
    nav,
    theme,
    mapIndex,
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

  return (
    <SubviewLayout content={content} nav={nav} streaming={streaming} themeName={themeName}>
      <MarkdownView
        content={content.markdown}
        showLineNumbers={showLineNumbers}
        marks={markState}
        docRef={docRef}
      />
    </SubviewLayout>
  )
}
