import { useMemo, useRef } from "react";
import type { TextBufferRenderable } from "@opentui/core";
import {
  MarkdownView,
  flattenMarkdown,
  getFlatBlockText,
  type CodeBlockRenderer,
  type FlatBlock,
} from "@tooee/renderers";
import { useCommand } from "@tooee/commands";
import { useDocumentController, type DocumentRowAdapter } from "@tooee/shell";
import type { MarkdownContent } from "../../types.js";
import { useContentCommands } from "../../hooks/useContentCommands.js";
import { ViewScreen } from "../ViewScreen.js";
import type { SubviewProps } from "./types.js";

interface MarkdownSubviewProps extends SubviewProps {
  content: MarkdownContent;
  codeBlockRenderers?: Record<string, CodeBlockRenderer>;
}

/** Columns moved per h/l press when scrolling a wide block horizontally. */
const BLOCK_HSCROLL_STEP = 4;

/**
 * Blocks are the row unit. `getFlatBlockText` keeps search/copy in step with the
 * source mapping (notably for synthetic bullet rows), and `getSource` projects
 * each block's Markdown provenance onto the controller's anchors.
 */
const MARKDOWN_BLOCK_ADAPTER: DocumentRowAdapter<FlatBlock> = {
  getText: (block) => getFlatBlockText(block),
  getSource: (block) => block.source,
};

export function MarkdownSubview({
  content,
  codeBlockRenderers,
  decorations,
  actions,
  ...screen
}: MarkdownSubviewProps) {
  const textContent = content.markdown;
  const lineCount = useMemo(() => textContent.split("\n").length, [textContent]);
  const blocks = useMemo(() => flattenMarkdown(content.markdown), [content.markdown]);

  const { showLineNumbers } = useContentCommands({ content, textContent });

  const document = useDocumentController<FlatBlock>({
    rows: blocks,
    adapter: MARKDOWN_BLOCK_ADAPTER,
    multiSelect: true,
    decorations,
    // The controller projects the screen's actions onto menu entries at open time.
    contextMenu: actions,
  });

  const hScrollableBlocksRef = useRef<Map<number, TextBufferRenderable>>(new Map());
  const cursorScrollable = () =>
    document.activeIndex !== null
      ? hScrollableBlocksRef.current.get(document.activeIndex)
      : undefined;
  useCommand({
    id: "block-scroll-left",
    title: "Scroll block left",
    hotkey: "h",
    modes: ["cursor"],
    when: () => cursorScrollable() != null,
    handler: () => {
      const target = cursorScrollable();
      if (target) target.scrollX -= BLOCK_HSCROLL_STEP;
    },
  });
  useCommand({
    id: "block-scroll-right",
    title: "Scroll block right",
    hotkey: "l",
    modes: ["cursor"],
    when: () => cursorScrollable() != null,
    handler: () => {
      const target = cursorScrollable();
      if (target) target.scrollX += BLOCK_HSCROLL_STEP;
    },
  });

  const statusItems = useMemo(
    () => [
      { label: "Format:", value: content.format },
      { label: "Lines:", value: String(lineCount) },
    ],
    [content.format, lineCount],
  );

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
        blocks={blocks}
        showLineNumbers={showLineNumbers}
        document={document}
        hScrollableBlocksRef={hScrollableBlocksRef}
        codeBlockRenderers={codeBlockRenderers}
      />
    </ViewScreen>
  );
}
