import { useMemo } from "react";
import type { ReactNode, RefObject } from "react";
import type { TextBufferRenderable } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/react";
import { useTheme } from "@tooee/themes";
import { DEFAULT_CODE_BLOCK_RENDERERS } from "./code-blocks.js";
import type { CodeBlockRenderer } from "./code-blocks.js";
import type { DocumentBindings } from "./document-bindings.js";
import { flattenMarkdown } from "./markdown-blocks.js";
import type { FlatBlock } from "./markdown-blocks.js";
import { FlatBlockRenderer } from "./markdown/blocks/flat-block.js";
import type { MarkdownLinkHandler } from "./markdown/links.js";
import {
  DEFAULT_SIGN_COLUMN_WIDTH,
  computeRowDocumentGutterWidth,
} from "./row-document-renderable.js";
import { useGutterPalette } from "./use-gutter-palette.js";
import "./row-document.js";
import "./text-table.js";

export { inlineLinkAtPosition } from "./markdown/links.js";
export type { InlineLinkPosition, MarkdownLinkHandler } from "./markdown/links.js";

type CodeBlockRendererRegistry = Record<string, CodeBlockRenderer>;

interface MarkdownViewProps {
  content: string;
  /**
   * Pre-flattened blocks to render, normally the exact array a subview passed
   * to its document controller. When supplied, `content` is *not* lexed again,
   * so the rendered rows and the controller's navigation rows cannot drift.
   * Omit it and `MarkdownView` flattens `content` itself for static callers.
   */
  blocks?: readonly FlatBlock[];
  showLineNumbers?: boolean;
  /**
   * Binds the row document to a document controller: its ref, the decoration
   * layers to paint, and the mouse handler. Rows are flattened *block* indices,
   * the same unit `j`/`k` move between and copy operates on. Omit it to render
   * a static, non-interactive document.
   *
   * Blocks are per-child renderables, but their markup varies across renderer
   * branches (box/text/null with differing margins), so the controller maps
   * clicks by screen-Y rather than per-child handlers. Clicks bubble up from
   * block children (including custom code blocks) unless a custom renderer
   * stops propagation.
   */
  document?: DocumentBindings;
  /** Registry of horizontally scrollable blocks, keyed by block index. */
  hScrollableBlocksRef?: RefObject<Map<number, TextBufferRenderable>>;
  /** Custom fenced-code renderers merged over the built-in defaults. */
  codeBlockRenderers?: CodeBlockRendererRegistry;
  /** Called when the primary mouse button activates inline Markdown link text. */
  onLinkActivate?: MarkdownLinkHandler;
  /** Directory used to resolve relative standard Markdown and Obsidian image embeds. */
  imageBasePath?: string;
}

/** Columns held back from the measured width for the scrollbar and right edge. */
const MARKDOWN_SCROLLBAR_RESERVE = 2;

export const MarkdownView = function MarkdownView({
  content,
  blocks: providedBlocks,
  showLineNumbers = true,
  document,
  hScrollableBlocksRef,
  codeBlockRenderers,
  onLinkActivate,
  imageBasePath,
}: MarkdownViewProps): ReactNode {
  const { theme, syntax } = useTheme();
  const palette = useGutterPalette();
  const { width: terminalWidth } = useTerminalDimensions();
  const blocks = useMemo(
    () => providedBlocks ?? flattenMarkdown(content),
    [providedBlocks, content],
  );

  const contentWidth = Math.max(
    1,
    terminalWidth -
      computeRowDocumentGutterWidth({
        rowCount: blocks.length,
        showLineNumbers,
        signColumnWidth: DEFAULT_SIGN_COLUMN_WIDTH,
      }) -
      MARKDOWN_SCROLLBAR_RESERVE,
  );

  const mergedCodeBlockRenderers = useMemo(() => {
    const entries = new Map(Object.entries(DEFAULT_CODE_BLOCK_RENDERERS));
    for (const [key, renderer] of Object.entries(codeBlockRenderers ?? {})) {
      entries.set(key.trim().toLowerCase(), renderer);
    }
    return Object.fromEntries(entries);
  }, [codeBlockRenderers]);

  const blockElements = useMemo(
    () =>
      blocks.map(
        (block, index): ReactNode => (
          <FlatBlockRenderer
            key={index}
            block={block}
            blockIndex={index}
            theme={theme}
            syntax={syntax}
            contentWidth={contentWidth}
            hScrollableBlocksRef={hScrollableBlocksRef}
            codeBlockRenderers={mergedCodeBlockRenderers}
            onLinkActivate={onLinkActivate}
            imageBasePath={imageBasePath}
          />
        ),
      ),
    [
      blocks,
      theme,
      syntax,
      contentWidth,
      hScrollableBlocksRef,
      mergedCodeBlockRenderers,
      onLinkActivate,
      imageBasePath,
    ],
  );

  return (
    <row-document
      ref={document?.ref}
      showLineNumbers={showLineNumbers}
      palette={palette}
      decorations={document?.decorations}
      signColumnWidth={DEFAULT_SIGN_COLUMN_WIDTH}
      style={{ flexGrow: 1 }}
      onMouseDown={document?.onMouseDown}
    >
      {blockElements}
    </row-document>
  );
};
