import { useMemo } from "react"
import { CodeView } from "@tooee/renderers"
import { actionsToContextMenuEntries, useDocumentController } from "@tooee/shell"
import type { CodeContent, TextContent } from "../../types.js"
import { useContentCommands } from "../../hooks/useContentCommands.js"
import { ViewScreen } from "../ViewScreen.js"
import type { SubviewProps } from "./types.js"

interface CodeSubviewProps extends SubviewProps {
  content: CodeContent | TextContent
}

const LINE_ADAPTER = { getText: (line: string) => line }

export function CodeSubview({ content, decorations, actions, ...screen }: CodeSubviewProps) {
  const textContent = content.format === "code" ? content.code : content.text
  const lines = useMemo(() => textContent.split("\n"), [textContent])

  const { showLineNumbers } = useContentCommands({ content, textContent })
  const contextMenu = useMemo(() => actionsToContextMenuEntries(actions), [actions])

  const document = useDocumentController<string>({
    rows: lines,
    adapter: LINE_ADAPTER,
    multiSelect: true,
    decorations,
    contextMenu,
  })

  const statusItems = useMemo(
    () => [
      { label: "Format:", value: content.format },
      { label: "Lines:", value: String(lines.length) },
    ],
    [content.format, lines.length],
  )

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={statusItems}
      {...screen}
    >
      <CodeView
        content={textContent}
        language={content.format === "code" ? content.language : undefined}
        showLineNumbers={showLineNumbers}
        document={document}
      />
    </ViewScreen>
  )
}
