import { useMemo } from "react"
import { CodeView } from "@tooee/renderers"
import { useDocumentController } from "@tooee/shell"
import { getTextContent, type CustomContent, type ContentRenderer } from "../../types.js"
import { useContentCommands } from "../../hooks/useContentCommands.js"
import { ViewScreen } from "../ViewScreen.js"
import type { SubviewProps } from "./types.js"

interface CustomSubviewProps extends SubviewProps {
  content: CustomContent
  renderers?: Record<string, ContentRenderer>
}

const LINE_ADAPTER = { getText: (line: string) => line }

export function CustomSubview({
  content,
  decorations,
  actions,
  renderers,
  ...screen
}: CustomSubviewProps) {
  const textContent = useMemo(() => getTextContent(content), [content])
  const lines = useMemo(() => textContent.split("\n"), [textContent])

  useContentCommands({ content, textContent })

  // Custom content has no action rows of its own, so no context menu is bound.
  const document = useDocumentController<string>({
    rows: lines,
    adapter: LINE_ADAPTER,
    multiSelect: true,
    decorations,
  })

  const statusItems = useMemo(
    () => [
      { label: "Format:", value: content.format },
      { label: "Lines:", value: String(lines.length) },
    ],
    [content.format, lines.length],
  )

  const customRenderer = renderers?.[content.format]

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={statusItems}
      {...screen}
    >
      {customRenderer ? (
        customRenderer({ content, document })
      ) : (
        <CodeView content={textContent} showLineNumbers={false} document={document} />
      )}
    </ViewScreen>
  )
}
