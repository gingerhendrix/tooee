import { useMemo, useRef } from "react"
import { marked } from "marked"
import type { TextBufferRenderable } from "@opentui/core"
import {
  MarkdownView,
  flattenTokens,
  type CodeBlockRenderer,
  type FlatBlock,
} from "@tooee/renderers"
import { useCommand } from "@tooee/commands"
import { actionsToContextMenuEntries, useDocumentController } from "@tooee/shell"
import type { MarkdownContent } from "../../types.js"
import { useContentCommands } from "../../hooks/useContentCommands.js"
import { ViewScreen } from "../ViewScreen.js"
import type { SubviewProps } from "./types.js"

interface MarkdownSubviewProps extends SubviewProps {
  content: MarkdownContent
  codeBlockRenderers?: Record<string, CodeBlockRenderer>
}

/** Columns moved per h/l press when scrolling a wide block horizontally. */
const BLOCK_HSCROLL_STEP = 4

/** Blocks are the row unit; their raw source is what search and copy see. */
const BLOCK_ADAPTER = {
  getText: ({ token }: FlatBlock) =>
    "raw" in token && typeof token.raw === "string" ? token.raw : "",
}

export function MarkdownSubview({
  content,
  codeBlockRenderers,
  decorations,
  actions,
  ...screen
}: MarkdownSubviewProps) {
  const textContent = content.markdown
  const lineCount = useMemo(() => textContent.split("\n").length, [textContent])
  const blocks = useMemo(() => flattenTokens(marked.lexer(content.markdown)), [content.markdown])

  const { showLineNumbers } = useContentCommands({ content, textContent })
  const contextMenu = useMemo(() => actionsToContextMenuEntries(actions), [actions])

  const document = useDocumentController<FlatBlock>({
    rows: blocks,
    adapter: BLOCK_ADAPTER,
    multiSelect: true,
    decorations,
    contextMenu,
  })

  const hScrollableBlocksRef = useRef<Map<number, TextBufferRenderable>>(new Map())
  const cursorScrollable = () =>
    document.activeIndex !== null
      ? hScrollableBlocksRef.current.get(document.activeIndex)
      : undefined
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

  const statusItems = useMemo(
    () => [
      { label: "Format:", value: content.format },
      { label: "Lines:", value: String(lineCount) },
    ],
    [content.format, lineCount],
  )

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={statusItems}
      {...screen}
    >
      <MarkdownView
        content={content.markdown}
        showLineNumbers={showLineNumbers}
        document={document}
        hScrollableBlocksRef={hScrollableBlocksRef}
        codeBlockRenderers={codeBlockRenderers}
      />
    </ViewScreen>
  )
}
