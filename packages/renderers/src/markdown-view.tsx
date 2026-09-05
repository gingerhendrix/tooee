import type { Token, Tokens } from "marked";
import { useEffect, useMemo, useState } from "react";
import { useTerminalDimensions } from "@opentui/react";
import type { ReactNode, RefObject } from "react";
import { useTheme } from "@tooee/themes";
import type { ResolvedTheme } from "@tooee/themes";
import {
  bold as boldChunk,
  italic as italicChunk,
  underline as underlineChunk,
  parseColor,
} from "@opentui/core";
import type {
  SyntaxStyle,
  TextBufferRenderable,
  TextTableContent,
  TextTableCellContent,
  TextChunk,
  MouseEvent,
} from "@opentui/core";
import type { DocumentBindings } from "./document-bindings.js";
import {
  DEFAULT_SIGN_COLUMN_WIDTH,
  computeRowDocumentGutterWidth,
} from "./row-document-renderable.js";
import { useGutterPalette } from "./use-gutter-palette.js";
import { CodeBlock, DEFAULT_CODE_BLOCK_RENDERERS } from "./code-blocks.js";
import type { CodeBlockRenderer } from "./code-blocks.js";
import { checkboxMarker, flattenMarkdown } from "./markdown-blocks.js";
import type { FlatBlock } from "./markdown-blocks.js";
import { resolveMarkdownImageSource, splitMarkdownImages } from "./markdown-images.js";
import type { MarkdownImageEmbed } from "./markdown-images.js";
import "./row-document.js";
import "./text-table.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// oxlint-disable-next-line anti-slop/no-unknown-returns -- public host callback accepts any ignored result; only literal true marks a handled link
export type MarkdownLinkHandler = (href: string) => unknown;

export interface InlineLinkPosition {
  line: number;
  column: number;
}

/** Markdown soft line endings separate prose words without forcing a rendered break. */
const normalizeSoftLineEndings = function normalizeSoftLineEndings(value: string): string {
  return value.replaceAll("\n", " ");
};

interface MarkedText {
  text: string;
}

/** Decode the optional text field on Marked's broad fallback token contract. */
const hasMarkedText = function hasMarkedText(token: Token): token is Token & MarkedText {
  if (!("text" in token)) {
    return false;
  }
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- primitive check stays at the Marked token boundary
  return typeof token.text === "string";
};

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
   * layers to paint, and the mouse handler. Rows are flattened *block* indices —
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
  /**
   * Registry of horizontally scrollable blocks, keyed by block index. Blocks
   * that can overflow horizontally (mermaid diagrams and code blocks)
   * register their text-buffer renderable here so the owning subview can
   * drive horizontal panning (`scrollX`) for the block under the nav cursor
   * (h/l in cursor mode).
   */
  hScrollableBlocksRef?: RefObject<Map<number, TextBufferRenderable>>;
  /**
   * Custom renderers for fenced code blocks, keyed by fence type. A fence's
   * type is the first whitespace-separated word of its info string, matched
   * case-insensitively. Entries are merged over the built-in defaults
   * (currently `mermaid`), so built-ins can be overridden. Unmatched types —
   * and renderers that return `null` or throw — fall back to the default
   * syntax-highlighted code block.
   */
  codeBlockRenderers?: CodeBlockRendererRegistry;
  /**
   * Called when the primary mouse button activates inline Markdown link text.
   * Return `true` when the host handled the href; handled clicks do not bubble
   * to document row selection. Unhandled links retain their native OSC-8 href.
   */
  onLinkActivate?: MarkdownLinkHandler;
  /** Directory used to resolve relative standard Markdown and Obsidian image embeds. */
  imageBasePath?: string;
}

// ---------------------------------------------------------------------------
// Inline link hit testing
// ---------------------------------------------------------------------------

/** Resolve a rendered text position to the Markdown link occupying that cell. */
export const inlineLinkAtPosition = function inlineLinkAtPosition(
  tokens: readonly Token[],
  position: InlineLinkPosition,
  initialColumn = 0,
): string | null {
  let line = 0;
  let column = initialColumn;
  let found: string | null = null;

  const advanceText = (value: string, href?: string): void => {
    const parts = value.split("\n");
    for (const [index, part] of parts.entries()) {
      const width = Bun.stringWidth(part);
      if (
        href !== undefined &&
        line === position.line &&
        position.column >= column &&
        position.column < column + width
      ) {
        found = href;
      }
      column += width;
      if (index < parts.length - 1) {
        line += 1;
        column = 0;
      }
    }
  };

  const visit = (items: readonly Token[], href?: string): void => {
    for (const token of items) {
      if (found !== null) {
        return;
      }
      switch (token.type) {
        case "text": {
          // SAFETY: Marked creates the member selected by the adjacent token.type branch.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
          advanceText(normalizeSoftLineEndings((token as Tokens.Text).text), href);
          break;
        }
        case "link": {
          // SAFETY: Marked creates the member selected by the adjacent token.type branch.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
          const link = token as Tokens.Link;
          visit(link.tokens, link.href);
          break;
        }
        case "strong": {
          // SAFETY: Marked creates the member selected by the adjacent token.type branch.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
          visit((token as Tokens.Strong).tokens, href);
          break;
        }
        case "em": {
          // SAFETY: Marked creates the member selected by the adjacent token.type branch.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
          visit((token as Tokens.Em).tokens, href);
          break;
        }
        case "del": {
          advanceText("~", href);
          // SAFETY: Marked creates the member selected by the adjacent token.type branch.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
          visit((token as Tokens.Del).tokens, href);
          advanceText("~", href);
          break;
        }
        case "codespan": {
          // SAFETY: Marked creates the member selected by the adjacent token.type branch.
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
          advanceText(` ${(token as Tokens.Codespan).text} `, href);
          break;
        }
        case "br": {
          advanceText("\n", href);
          break;
        }
        case "space": {
          advanceText(" ", href);
          break;
        }
        default: {
          if (hasMarkedText(token)) {
            advanceText(token.text, href);
          }
        }
      }
    }
  };

  visit(tokens);
  return found;
};

const linkMouseHandler = function linkMouseHandler(
  tokens: readonly Token[],
  onLinkActivate: MarkdownLinkHandler | undefined,
  initialColumn = 0,
): ((event: MouseEvent) => void) | undefined {
  if (onLinkActivate === undefined) {
    return undefined;
  }
  return (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    const { target } = event;
    if (target === null || target === undefined || !("lineInfo" in target)) {
      return;
    }
    // SAFETY: OpenTUI supplies a renderable target, and the lineInfo guard proves this text-buffer member.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: OpenTUI supplies renderable mouse targets, and the lineInfo membership guard above identifies its TextBufferRenderable contract
    const text = target as TextBufferRenderable;
    const visualLine = event.y - text.y;
    const sourceLine = text.lineInfo.lineSources[visualLine];
    const startColumn = text.lineInfo.lineStartCols[visualLine];
    if (sourceLine === undefined || startColumn === undefined) {
      return;
    }
    const href = inlineLinkAtPosition(
      tokens,
      {
        column: startColumn + event.x - text.x,
        line: sourceLine,
      },
      initialColumn,
    );
    if (href === null || onLinkActivate(href) !== true) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  // Blocks that must be told their width (diff fences) need the columns left
  // after the row-document gutter and the scrollbar.
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

  // Merge user renderers over built-in defaults, normalizing keys to
  // lowercase so registration matches fence types case-insensitively.
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
          // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
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

// ---------------------------------------------------------------------------
// Block renderer (flat)
// ---------------------------------------------------------------------------

const FlatBlockRenderer = function FlatBlockRenderer({
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

  // List item line (has bullet)
  if (bullet !== undefined) {
    // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
    return <ListLineRenderer block={block} theme={theme} onLinkActivate={onLinkActivate} />;
  }

  // Regular block token
  switch (token.type) {
    case "heading": {
      // SAFETY: Marked creates the member selected by the adjacent token.type branch.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
      const headingToken = token as Tokens.Heading;
      return (
        // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
        <HeadingRenderer
          token={headingToken}
          theme={theme}
          indent={indent}
          onLinkActivate={onLinkActivate}
        />
      );
    }
    case "paragraph": {
      // SAFETY: Marked creates the member selected by the adjacent token.type branch.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
      const paragraphToken = token as Tokens.Paragraph;
      return (
        // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
        <ParagraphRenderer
          token={paragraphToken}
          theme={theme}
          indent={indent}
          onLinkActivate={onLinkActivate}
          imageBasePath={imageBasePath}
        />
      );
    }
    case "code": {
      // SAFETY: Marked creates the member selected by the adjacent token.type branch.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
      const codeToken = token as Tokens.Code;
      return (
        <CodeBlock
          token={codeToken}
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
      // SAFETY: Marked creates the member selected by the adjacent token.type branch.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
      const blockquoteToken = token as Tokens.Blockquote;
      return (
        // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
        <BlockquoteRenderer
          token={blockquoteToken}
          theme={theme}
          indent={indent}
          onLinkActivate={onLinkActivate}
        />
      );
    }
    case "table": {
      // SAFETY: Marked creates the member selected by the adjacent token.type branch.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
      const tableToken = token as Tokens.Table;
      // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
      return <MarkdownTableRenderer token={tableToken} indent={indent} />;
    }
    case "hr": {
      // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
      return <HorizontalRule theme={theme} indent={indent} />;
    }
    case "space":
    case "html": {
      return null;
    }
    default: {
      if (hasMarkedText(token)) {
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
      }
      return null;
    }
  }
};

// ---------------------------------------------------------------------------
// List line renderer
// ---------------------------------------------------------------------------

const ListLineRenderer = function ListLineRenderer({
  block,
  theme,
  onLinkActivate,
}: {
  block: FlatBlock;
  theme: ResolvedTheme;
  onLinkActivate?: MarkdownLinkHandler;
}): ReactNode {
  const { token, indent, bullet, checked } = block;
  const checkboxPrefix = checkboxMarker(checked);

  // Get inline tokens from the text/paragraph token
  const inlineTokens: Token[] =
    "tokens" in token && Array.isArray(token.tokens) ? token.tokens : [];

  const tokenText = hasMarkedText(token) ? token.text : "";
  const hasContent = inlineTokens.length > 0 || tokenText.length > 0;

  let content: ReactNode = null;
  if (inlineTokens.length > 0) {
    // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
    content = <InlineTokens tokens={inlineTokens} theme={theme} />;
  } else if (tokenText.length > 0) {
    content = tokenText;
  }

  return (
    <box style={{ marginLeft: 1 + indent, marginRight: 1 }}>
      <text
        style={{ fg: theme.markdownText }}
        onMouseDown={linkMouseHandler(
          inlineTokens,
          onLinkActivate,
          Bun.stringWidth(`${bullet}${checkboxPrefix}`),
        )}
      >
        <span fg={theme.markdownListItem}>{bullet}</span>
        {checkboxPrefix !== "" && (
          <span fg={checked === true ? theme.accent : theme.textMuted}>{checkboxPrefix}</span>
        )}
        {hasContent && content}
      </text>
    </box>
  );
};

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

const HeadingRenderer = function HeadingRenderer({
  token,
  theme,
  indent,
  onLinkActivate,
}: {
  token: Tokens.Heading;
  theme: ResolvedTheme;
  indent: number;
  onLinkActivate?: MarkdownLinkHandler;
}): ReactNode {
  const headingColors = new Map<number, string>([
    [1, theme.markdownHeading],
    [2, theme.secondary],
    [3, theme.accent],
    [4, theme.text],
    [5, theme.textMuted],
    [6, theme.textMuted],
  ]);

  const prefixes = new Map<number, string>([
    [1, "# "],
    [2, "## "],
    [3, "### "],
    [4, "#### "],
    [5, "##### "],
    [6, "###### "],
  ]);

  return (
    <box style={{ marginBottom: 1, marginLeft: indent, marginTop: 1 }}>
      <text
        style={{ fg: headingColors.get(token.depth) ?? theme.text }}
        onMouseDown={linkMouseHandler(
          token.tokens,
          onLinkActivate,
          Bun.stringWidth(prefixes.get(token.depth) ?? ""),
        )}
      >
        <span fg={theme.textMuted}>{prefixes.get(token.depth)}</span>
        <strong>
          {/* oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization */}
          <InlineTokens tokens={token.tokens} theme={theme} />
        </strong>
      </text>
    </box>
  );
};

const ParagraphRenderer = function ParagraphRenderer({
  token,
  theme,
  indent,
  onLinkActivate,
  imageBasePath,
}: {
  token: Tokens.Paragraph;
  theme: ResolvedTheme;
  indent: number;
  onLinkActivate?: MarkdownLinkHandler;
  imageBasePath?: string;
}): ReactNode {
  const segments = splitMarkdownImages(token.tokens);
  return (
    <box
      style={{
        flexDirection: "column",
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
      }}
    >
      {segments.map(
        (segment, index): ReactNode =>
          segment.type === "image" ? (
            // oxlint-disable-next-line no-use-before-define -- Keep paragraph rendering before its image helper.
            <MarkdownImage key={index} image={segment} basePath={imageBasePath} theme={theme} />
          ) : (
            <text
              key={index}
              style={{ fg: theme.markdownText }}
              onMouseDown={linkMouseHandler(segment.tokens, onLinkActivate)}
            >
              {/* oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization */}
              <InlineTokens tokens={segment.tokens} theme={theme} />
            </text>
          ),
      )}
    </box>
  );
};

const MarkdownImage = function MarkdownImage({
  image,
  basePath,
  theme,
}: {
  image: MarkdownImageEmbed;
  basePath?: string;
  theme: ResolvedTheme;
}): ReactNode {
  const source = resolveMarkdownImageSource(image.source, basePath);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    setState("loading");
  }, [source]);

  return (
    <box style={{ flexDirection: "column" }}>
      {state === "loading" && (
        <text content={`Loading image: ${image.alt ?? image.source}`} fg={theme.textMuted} />
      )}
      {state === "error" && (
        <text content={`Image failed to load: ${image.alt ?? image.source}`} fg={theme.error} />
      )}
      <image
        source={source}
        fit="fit"
        protocol="auto"
        onLoad={() => {
          setState("loaded");
        }}
        onError={() => {
          setState("error");
        }}
        style={{ height: image.height ?? 12, width: image.width ?? "100%" }}
      />
    </box>
  );
};

const BlockquoteRenderer = function BlockquoteRenderer({
  token,
  theme,
  indent,
  onLinkActivate,
}: {
  token: Tokens.Blockquote;
  theme: ResolvedTheme;
  indent: number;
  onLinkActivate?: MarkdownLinkHandler;
}): ReactNode {
  // Collect inline tokens from blockquote's child paragraphs/text
  const inlineTokens: Token[] = [];
  for (const child of token.tokens) {
    if ("tokens" in child && Array.isArray(child.tokens)) {
      if (inlineTokens.length > 0) {
        inlineTokens.push({ raw: "\n", type: "br" });
      }
      inlineTokens.push(...child.tokens);
    } else if (hasMarkedText(child)) {
      inlineTokens.push(child);
    }
  }

  return (
    <box
      border={["left"]}
      borderColor={theme.markdownBlockQuote}
      borderStyle="single"
      style={{
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
        marginTop: 0,
        paddingLeft: 1,
      }}
    >
      <text
        style={{ fg: theme.textMuted }}
        onMouseDown={linkMouseHandler(inlineTokens, onLinkActivate)}
      >
        {/* oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization */}
        <InlineTokens tokens={inlineTokens} theme={theme} />
      </text>
    </box>
  );
};

const MarkdownTableRenderer = function MarkdownTableRenderer({
  token,
  indent,
}: {
  token: Tokens.Table;
  indent: number;
}): ReactNode {
  const { theme } = useTheme();

  const content: TextTableContent = useMemo(() => {
    const headerRow: TextTableCellContent[] = token.header.map((cell) => {
      // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
      const chunks = inlineTokensToChunks(cell.tokens, theme);
      // Wrap header chunks in bold
      return chunks.length > 0
        ? chunks.map((c) => boldChunk(c))
        : [
            // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
            boldChunk(getPlainText(cell.tokens).trim()),
          ];
    });
    const dataRows = token.rows.map((row) =>
      row.map((cell) => {
        // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
        const chunks = inlineTokensToChunks(cell.tokens, theme);
        if (chunks.length > 0) {
          return chunks;
        }
        const fallbackCell: TextTableCellContent = [
          // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization
          { __isChunk: true, text: getPlainText(cell.tokens) },
        ];
        return fallbackCell;
      }),
    );
    return [headerRow, ...dataRows];
  }, [token, theme]);

  return (
    <box style={{ marginBottom: 1, marginLeft: 1 + indent, marginRight: 1 }}>
      <text-table
        content={content}
        wrapMode="word"
        columnWidthMode="content"
        cellPadding={0}
        border={true}
        borderStyle="single"
        borderColor={theme.border}
        fg={theme.text}
      />
    </box>
  );
};

const HorizontalRule = function HorizontalRule({
  theme,
  indent,
}: {
  theme: ResolvedTheme;
  indent: number;
}): ReactNode {
  return (
    <box style={{ marginBottom: 1, marginLeft: 1 + indent, marginRight: 1, marginTop: 0 }}>
      <text style={{ fg: theme.markdownHorizontalRule }} content={"─".repeat(40)} />
    </box>
  );
};

// ---------------------------------------------------------------------------
// Inline token rendering (React elements)
// ---------------------------------------------------------------------------

const InlineTokens = function InlineTokens({
  tokens,
  theme,
}: {
  tokens: Token[];
  theme: ResolvedTheme;
}): ReactNode {
  const result: ReactNode[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) {
      continue;
    }
    const key = i;

    switch (token.type) {
      case "text": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        result.push(normalizeSoftLineEndings((token as Tokens.Text).text));
        break;
      }
      case "strong": {
        // SAFETY: Marked creates a Strong token for the adjacent type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Marked's broad Token fallback prevents discriminator narrowing
        const strongToken = token as Tokens.Strong;
        result.push(
          <strong key={key}>
            {/* oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization */}
            <InlineTokens tokens={strongToken.tokens} theme={theme} />
          </strong>,
        );
        break;
      }
      case "em": {
        // SAFETY: Marked creates an Em token for the adjacent type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Marked's broad Token fallback prevents discriminator narrowing
        const emToken = token as Tokens.Em;
        result.push(
          <em key={key}>
            {/* oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization */}
            <InlineTokens tokens={emToken.tokens} theme={theme} />
          </em>,
        );
        break;
      }
      case "codespan": {
        // SAFETY: Marked creates a Codespan token for the adjacent type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Marked's broad Token fallback prevents discriminator narrowing
        const codespanToken = token as Tokens.Codespan;
        result.push(
          <span key={key} fg={theme.markdownCode} bg={theme.backgroundPanel}>
            {` ${codespanToken.text} `}
          </span>,
        );
        break;
      }
      case "link": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        const linkToken = token as Tokens.Link;
        result.push(
          <u key={key}>
            <a href={linkToken.href} fg={theme.markdownLink}>
              {/* oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization */}
              <InlineTokens tokens={linkToken.tokens} theme={theme} />
            </a>
          </u>,
        );
        break;
      }
      case "del": {
        // SAFETY: Marked creates a Del token for the adjacent type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Marked's broad Token fallback prevents discriminator narrowing
        const delToken = token as Tokens.Del;
        result.push(
          <span key={key} fg={theme.textMuted}>
            ~
            {/* oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down renderer organization */}
            <InlineTokens tokens={delToken.tokens} theme={theme} />~
          </span>,
        );
        break;
      }
      case "image": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        const imgToken = token as Tokens.Image;
        result.push(
          <span key={key} fg={theme.textMuted}>
            {imgToken.text || imgToken.href}
          </span>,
        );
        break;
      }
      case "br": {
        result.push("\n");
        break;
      }
      case "escape": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        result.push((token as Tokens.Escape).text);
        break;
      }
      case "space": {
        result.push(" ");
        break;
      }
      default: {
        if (hasMarkedText(token)) {
          result.push(token.text);
        }
        break;
      }
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// Inline token rendering (TextChunks — for text-table cells)
// ---------------------------------------------------------------------------

const inlineTokensToChunks = function inlineTokensToChunks(
  tokens: Token[],
  theme: ResolvedTheme,
): TextChunk[] {
  const chunks: TextChunk[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "text": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        chunks.push({ __isChunk: true as const, text: (token as Tokens.Text).text });
        break;
      }
      case "strong": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        for (const sub of inlineTokensToChunks((token as Tokens.Strong).tokens, theme)) {
          chunks.push(boldChunk(sub));
        }
        break;
      }
      case "em": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        for (const sub of inlineTokensToChunks((token as Tokens.Em).tokens, theme)) {
          chunks.push(italicChunk(sub));
        }
        break;
      }
      case "codespan": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        const codespanToken = token as Tokens.Codespan;
        chunks.push({
          __isChunk: true as const,
          bg: parseColor(theme.backgroundPanel),
          fg: parseColor(theme.markdownCode),
          text: ` ${codespanToken.text} `,
        });
        break;
      }
      case "link": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        const linkToken = token as Tokens.Link;
        for (const sub of inlineTokensToChunks(linkToken.tokens, theme)) {
          chunks.push(underlineChunk({ ...sub, fg: parseColor(theme.markdownLink) }));
        }
        break;
      }
      case "escape": {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        chunks.push({ __isChunk: true as const, text: (token as Tokens.Escape).text });
        break;
      }
      default: {
        if (hasMarkedText(token)) {
          chunks.push({ __isChunk: true as const, text: token.text });
        }
        break;
      }
    }
  }

  return chunks;
};

// ---------------------------------------------------------------------------
// Plain text extraction (only for width computation, not rendering)
// ---------------------------------------------------------------------------

const getPlainText = function getPlainText(tokens: Token[]): string {
  return tokens
    .map((token) => {
      if (token.type === "text") {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        return (token as { text: string }).text;
      }
      if (token.type === "codespan") {
        // SAFETY: Marked creates the member selected by the adjacent token.type branch.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: Marked emits the token member selected by the adjacent type branch; its broad Token fallback prevents TypeScript from retaining that discriminator
        return (token as Tokens.Codespan).text;
      }
      if ("tokens" in token && token.tokens) {
        return getPlainText(token.tokens);
      }
      if (hasMarkedText(token)) {
        return token.text;
      }
      return "";
    })
    .join("");
};
