import type { TextBufferRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useBuildCommandContext, useCommand } from "@tooee/commands";
import { MarkdownView, flattenMarkdown, getFlatBlockText } from "@tooee/renderers";
import type { CodeBlockRenderer, FlatBlock } from "@tooee/renderers";
import type { DocumentRowAdapter } from "@tooee/shell";
import { useMemo, useRef } from "react";
import type { ReactNode } from "react";

import { markdownHeadingFoldRanges } from "../../folds/markdown-heading-folds.js";
import { useFoldActions, useFoldCommands, useFoldState } from "../../folds/use-folds.js";
import { useContentDocument } from "../../hooks/use-content-document.js";
import { OutlinePanel } from "../../outline/outline-panel.js";
import { useMarkdownOutline } from "../../outline/use-outline.js";
import type { MarkdownContent, MarkdownLinkActivateHandler } from "../../types.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";

interface MarkdownSubviewProps extends SubviewProps {
  content: MarkdownContent;
  codeBlockRenderers?: Record<string, CodeBlockRenderer>;
  onLinkActivate?: MarkdownLinkActivateHandler;
  /** Open the heading outline beside the document at start. */
  outline?: boolean;
}

/** Columns moved per h/l press when scrolling a wide block horizontally. */
const BLOCK_HSCROLL_STEP = 4;

/**
 * Blocks are the row unit. `getFlatBlockText` keeps search/copy in step with the
 * source mapping (notably for synthetic bullet rows), and `getSource` projects
 * each block's Markdown provenance onto the controller's anchors. The key is
 * the block's index in the full flattened document, so it stays the same when
 * folds hide the blocks around it.
 */
const markdownBlockAdapter = function markdownBlockAdapter(
  blocks: readonly FlatBlock[]
): DocumentRowAdapter<FlatBlock> {
  const indices = new Map(blocks.map((block, index) => [block, index]));
  return {
    getKey: (block, index) => indices.get(block) ?? index,
    getSource: (block) => block.source,
    getText: (block) => getFlatBlockText(block),
  };
};

export const MarkdownSubview = function MarkdownSubview({
  content,
  codeBlockRenderers,
  onLinkActivate,
  outline: initialOutline = false,
  decorations,
  actions,
  ...screen
}: MarkdownSubviewProps): ReactNode {
  const textContent = content.markdown;
  const lineCount = useMemo(() => textContent.split("\n").length, [textContent]);
  const blocks = useMemo(() => flattenMarkdown(content.markdown), [content.markdown]);
  const adapter = useMemo(() => markdownBlockAdapter(blocks), [blocks]);
  const foldRanges = useMemo(() => markdownHeadingFoldRanges(blocks), [blocks]);
  // Closed heading folds filter `blocks`; `folds.rows` is the one array both
  // the controller and the renderer see.
  const folds = useFoldState(blocks, foldRanges, decorations);

  const { document, showLineNumbers, statusItems } = useContentDocument<FlatBlock>(
    folds.rows,
    adapter,
    { actions, content, decorations: folds.decorations, textContent },
    {
      multiSelect: true,
      preserveCursorByKey: true,
      statusItems: [
        { label: "Format:", value: content.format },
        { label: "Lines:", value: String(lineCount) },
      ],
    }
  );
  const foldActions = useFoldActions(folds, document.navigation);
  useFoldCommands(folds, foldActions, document.navigation);
  // Declared after the controller, so its jump effect runs after the
  // controller has taken the new rows.
  const outline = useMarkdownOutline({
    blocks,
    folds,
    initialOpen: initialOutline,
    navigation: document.navigation,
  });
  const { width: terminalWidth } = useTerminalDimensions();
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
      aside={<OutlinePanel outline={outline} foldActions={foldActions} />}
      {...screen}
    >
      <MarkdownView
        content={content.markdown}
        blocks={folds.rows}
        rowNumbers={folds.rowNumbers}
        foldedBlocks={folds.view.hiddenCounts}
        showLineNumbers={showLineNumbers}
        document={document}
        hScrollableBlocksRef={hScrollableBlocksRef}
        codeBlockRenderers={codeBlockRenderers}
        onLinkActivate={handleLinkActivate}
        imageBasePath={content.imageBasePath}
        width={outline.visible ? terminalWidth - outline.width : undefined}
      />
    </ViewScreen>
  );
};
