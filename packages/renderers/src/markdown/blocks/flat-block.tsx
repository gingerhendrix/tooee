import type { SyntaxStyle, TextBufferRenderable } from "@opentui/core";
import type { ResolvedTheme } from "@tooee/themes";
import type { Token } from "marked";
import type { ReactNode, RefObject } from "react";

import { CodeBlock } from "../../code-blocks.js";
import type { CodeBlockRenderer } from "../../code-blocks.js";
import type { FlatBlock } from "../../markdown-blocks.js";
import type { MarkdownLinkHandler } from "../links.js";
import { hasMarkedText } from "../tokens.js";
import { BlockquoteRenderer } from "./blockquote.js";
import { HeadingRenderer } from "./heading.js";
import { HorizontalRule } from "./horizontal-rule.js";
import { ListLineRenderer } from "./list-line.js";
import { ParagraphRenderer } from "./paragraph.js";
import { MarkdownTableRowRenderer } from "./table.js";

type CodeBlockRendererRegistry = Record<string, CodeBlockRenderer>;

/** A block with no dedicated renderer: its plain text, when the token has any. */
const OtherBlockRenderer = function OtherBlockRenderer({
  token,
  theme,
  indent,
}: {
  token: Token;
  theme: ResolvedTheme;
  indent: number;
}): ReactNode {
  if (!hasMarkedText(token)) {
    return null;
  }

  return (
    <text
      content={token.text}
      style={{
        fg: theme.markdownText,
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
        marginTop: 0,
      }}
    />
  );
};

export const FlatBlockRenderer = function FlatBlockRenderer({
  block,
  blockIndex,
  hiddenCount,
  theme,
  syntax,
  contentWidth,
  hScrollableBlocksRef,
  codeBlockRenderers,
  onLinkActivate,
  imageBasePath,
}: {
  block: FlatBlock;
  blockIndex: number;
  /** Rows hidden under this block by a closed fold. */
  hiddenCount?: number;
  theme: ResolvedTheme;
  syntax: SyntaxStyle;
  contentWidth: number;
  hScrollableBlocksRef?: RefObject<Map<number, TextBufferRenderable>>;
  codeBlockRenderers?: CodeBlockRendererRegistry;
  onLinkActivate?: MarkdownLinkHandler;
  imageBasePath?: string;
}): ReactNode {
  const { indent } = block;

  switch (block.kind) {
    case "table-row": {
      return (
        <MarkdownTableRowRenderer
          table={block.row.table}
          index={block.row.index}
          indent={indent}
          theme={theme}
          contentWidth={contentWidth}
          onLinkActivate={onLinkActivate}
        />
      );
    }

    case "list-line": {
      return <ListLineRenderer block={block} theme={theme} onLinkActivate={onLinkActivate} />;
    }

    case "heading": {
      return (
        <HeadingRenderer
          token={block.token}
          theme={theme}
          indent={indent}
          hiddenCount={hiddenCount}
          onLinkActivate={onLinkActivate}
        />
      );
    }

    case "paragraph": {
      return (
        <ParagraphRenderer
          token={block.token}
          theme={theme}
          indent={indent}
          onLinkActivate={onLinkActivate}
          imageBasePath={imageBasePath}
          contentWidth={contentWidth}
        />
      );
    }

    case "code": {
      return (
        <CodeBlock
          token={block.token}
          blockIndex={blockIndex}
          theme={theme}
          syntax={syntax}
          indent={indent}
          contentWidth={contentWidth}
          hScrollableBlocksRef={hScrollableBlocksRef}
          renderers={codeBlockRenderers}
        />
      );
    }

    case "blockquote": {
      return (
        <BlockquoteRenderer
          token={block.token}
          theme={theme}
          indent={indent}
          onLinkActivate={onLinkActivate}
        />
      );
    }

    case "hr": {
      return <HorizontalRule theme={theme} indent={indent} />;
    }

    case "other": {
      return <OtherBlockRenderer token={block.token} theme={theme} indent={indent} />;
    }

    default: {
      // A new `FlatBlock` kind without a case here fails to compile.
      const unhandled: never = block;

      return unhandled;
    }
  }
};
