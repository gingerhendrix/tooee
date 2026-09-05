import { useMemo, useRef } from "react";
import type { TextBufferRenderable } from "@opentui/core";
import { MarkdownView, flattenMarkdown, getFlatBlockText } from "@tooee/renderers";
import type { CodeBlockRenderer, FlatBlock } from "@tooee/renderers";
import { useBuildCommandContext, useCommand } from "@tooee/commands";
import type { DocumentRowAdapter } from "@tooee/shell";
import type { MarkdownContent, MarkdownLinkActivateHandler } from "../../types.js";
import { useContentDocument } from "../../hooks/use-content-document.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";
import type { ReactNode } from "react";

interface MarkdownSubviewProps extends SubviewProps {
  content: MarkdownContent;
  codeBlockRenderers?: Record<string, CodeBlockRenderer>;
  onLinkActivate?: MarkdownLinkActivateHandler;
}

/** Columns moved per h/l press when scrolling a wide block horizontally. */
const BLOCK_HSCROLL_STEP = 4;

/**
 * Blocks are the row unit. `getFlatBlockText` keeps search/copy in step with the
 * source mapping (notably for synthetic bullet rows), and `getSource` projects
 * each block's Markdown provenance onto the controller's anchors.
 */
const MARKDOWN_BLOCK_ADAPTER: DocumentRowAdapter<FlatBlock> = {
  getSource: (block) => block.source,
  getText: (block) => getFlatBlockText(block),
};

export const MarkdownSubview = function MarkdownSubview({
  content,
  codeBlockRenderers,
  onLinkActivate,
  decorations,
  actions,
  ...screen
}: MarkdownSubviewProps): ReactNode {
  const textContent = content.markdown;
  const lineCount = useMemo(() => textContent.split("\n").length, [textContent]);
  const blocks = useMemo(() => flattenMarkdown(content.markdown), [content.markdown]);

  const { document, showLineNumbers, statusItems } = useContentDocument<FlatBlock>(
    blocks,
    MARKDOWN_BLOCK_ADAPTER,
    { actions, content, decorations, textContent },
    {
      multiSelect: true,
      statusItems: [
        { label: "Format:", value: content.format },
        { label: "Lines:", value: String(lineCount) },
      ],
    },
  );
  const buildCommandContext = useBuildCommandContext();
  const handleLinkActivate = onLinkActivate
    ? (href: string) => onLinkActivate(href, buildCommandContext())
    : undefined;

  const hScrollableBlocksRef = useRef<Map<number, TextBufferRenderable>>(new Map());
  const cursorScrollable = () =>
    document.activeIndex === null
      ? undefined
      : hScrollableBlocksRef.current.get(document.activeIndex);
  useCommand({
    handler: () => {
      const target = cursorScrollable();
      if (target) {
        target.scrollX -= BLOCK_HSCROLL_STEP;
      }
    },
    hotkey: "h",
    id: "block-scroll-left",
    modes: ["cursor"],
    title: "Scroll block left",
    when: () => cursorScrollable() !== undefined,
  });
  useCommand({
    handler: () => {
      const target = cursorScrollable();
      if (target) {
        target.scrollX += BLOCK_HSCROLL_STEP;
      }
    },
    hotkey: "l",
    id: "block-scroll-right",
    modes: ["cursor"],
    title: "Scroll block right",
    when: () => cursorScrollable() !== undefined,
  });

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
        onLinkActivate={handleLinkActivate}
        imageBasePath={content.imageBasePath}
      />
    </ViewScreen>
  );
};
