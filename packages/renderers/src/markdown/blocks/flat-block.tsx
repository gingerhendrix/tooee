import type { ReactNode, RefObject } from "react";
import type { SyntaxStyle, TextBufferRenderable } from "@opentui/core";
import type { ResolvedTheme } from "@tooee/themes";
import { CodeBlock } from "../../code-blocks.js";
import type { CodeBlockRenderer } from "../../code-blocks.js";
import type { FlatBlock } from "../../markdown-blocks.js";
import { BlockquoteRenderer } from "./blockquote.js";
import { HeadingRenderer } from "./heading.js";
import { HorizontalRule } from "./horizontal-rule.js";
import { ListLineRenderer } from "./list-line.js";
import { ParagraphRenderer } from "./paragraph.js";
import { MarkdownTableRenderer } from "./table.js";
import type { MarkdownLinkHandler } from "../links.js";
import { hasMarkedText, narrowToken } from "../tokens.js";

type CodeBlockRendererRegistry = Record<string, CodeBlockRenderer>;

export const FlatBlockRenderer = function FlatBlockRenderer({
  block,
  blockIndex,
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
  theme: ResolvedTheme;
  syntax: SyntaxStyle;
  contentWidth: number;
  hScrollableBlocksRef?: RefObject<Map<number, TextBufferRenderable>>;
  codeBlockRenderers?: CodeBlockRendererRegistry;
  onLinkActivate?: MarkdownLinkHandler;
  imageBasePath?: string;
}): ReactNode {
  const { token, indent, bullet } = block;

  if (bullet !== undefined) {
    return <ListLineRenderer block={block} theme={theme} onLinkActivate={onLinkActivate} />;
  }

  const heading = narrowToken(token, "heading");
  if (heading !== null) {
    return (
      <HeadingRenderer
        token={heading}
        theme={theme}
        indent={indent}
        onLinkActivate={onLinkActivate}
      />
    );
  }
  const paragraph = narrowToken(token, "paragraph");
  if (paragraph !== null) {
    return (
      <ParagraphRenderer
        token={paragraph}
        theme={theme}
        indent={indent}
        onLinkActivate={onLinkActivate}
        imageBasePath={imageBasePath}
      />
    );
  }
  const code = narrowToken(token, "code");
  if (code !== null) {
    return (
      <CodeBlock
        token={code}
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
  const blockquote = narrowToken(token, "blockquote");
  if (blockquote !== null) {
    return (
      <BlockquoteRenderer
        token={blockquote}
        theme={theme}
        indent={indent}
        onLinkActivate={onLinkActivate}
      />
    );
  }
  const table = narrowToken(token, "table");
  if (table !== null) {
    return <MarkdownTableRenderer token={table} indent={indent} />;
  }
  if (token.type === "hr") {
    return <HorizontalRule theme={theme} indent={indent} />;
  }
  if (token.type === "space" || token.type === "html") {
    return null;
  }
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
