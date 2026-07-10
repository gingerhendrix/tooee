import { type Token, type Tokens } from "marked"
import { useMemo, type ReactNode, type RefObject } from "react"
import { useTheme, type ResolvedTheme } from "@tooee/themes"
import {
  bold as boldChunk,
  italic as italicChunk,
  underline as underlineChunk,
  parseColor,
} from "@opentui/core"
import type {
  SyntaxStyle,
  TextBufferRenderable,
  TextTableContent,
  TextTableCellContent,
  TextChunk,
} from "@opentui/core"
import type { DocumentBindings } from "./DocumentBindings.js"
import { DEFAULT_SIGN_COLUMN_WIDTH } from "./RowDocumentRenderable.js"
import { useGutterPalette } from "./useGutterPalette.js"
import { CodeBlock, DEFAULT_CODE_BLOCK_RENDERERS, type CodeBlockRenderer } from "./code-blocks.js"
import { flattenMarkdown, type FlatBlock } from "./markdown-blocks.js"
import "./row-document.js"
import "./text-table.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarkdownViewProps {
  content: string
  /**
   * Pre-flattened blocks to render, normally the exact array a subview passed
   * to its document controller. When supplied, `content` is *not* lexed again,
   * so the rendered rows and the controller's navigation rows cannot drift.
   * Omit it and `MarkdownView` flattens `content` itself for static callers.
   */
  blocks?: readonly FlatBlock[]
  showLineNumbers?: boolean
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
  document?: DocumentBindings
  /**
   * Registry of horizontally scrollable blocks, keyed by block index. Blocks
   * that can overflow horizontally (mermaid diagrams and code blocks)
   * register their text-buffer renderable here so the owning subview can
   * drive horizontal panning (`scrollX`) for the block under the nav cursor
   * (h/l in cursor mode).
   */
  hScrollableBlocksRef?: RefObject<Map<number, TextBufferRenderable>>
  /**
   * Custom renderers for fenced code blocks, keyed by fence type. A fence's
   * type is the first whitespace-separated word of its info string, matched
   * case-insensitively. Entries are merged over the built-in defaults
   * (currently `mermaid`), so built-ins can be overridden. Unmatched types —
   * and renderers that return `null` or throw — fall back to the default
   * syntax-highlighted code block.
   */
  codeBlockRenderers?: Record<string, CodeBlockRenderer>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarkdownView({
  content,
  blocks: providedBlocks,
  showLineNumbers = true,
  document,
  hScrollableBlocksRef,
  codeBlockRenderers,
}: MarkdownViewProps) {
  const { theme, syntax } = useTheme()
  const palette = useGutterPalette()
  const blocks = useMemo(
    () => providedBlocks ?? flattenMarkdown(content),
    [providedBlocks, content],
  )

  // Merge user renderers over built-in defaults, normalizing keys to
  // lowercase so registration matches fence types case-insensitively.
  const mergedCodeBlockRenderers = useMemo(() => {
    const merged: Record<string, CodeBlockRenderer> = { ...DEFAULT_CODE_BLOCK_RENDERERS }
    for (const [key, renderer] of Object.entries(codeBlockRenderers ?? {})) {
      merged[key.trim().toLowerCase()] = renderer
    }
    return merged
  }, [codeBlockRenderers])

  const blockElements = useMemo(
    () =>
      blocks.map((block, index) => (
        <FlatBlockRenderer
          key={index}
          block={block}
          blockIndex={index}
          theme={theme}
          syntax={syntax}
          hScrollableBlocksRef={hScrollableBlocksRef}
          codeBlockRenderers={mergedCodeBlockRenderers}
        />
      )),
    [blocks, theme, syntax, hScrollableBlocksRef, mergedCodeBlockRenderers],
  )

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
  )
}

// ---------------------------------------------------------------------------
// Block renderer (flat)
// ---------------------------------------------------------------------------

function FlatBlockRenderer({
  block,
  blockIndex,
  theme,
  syntax,
  hScrollableBlocksRef,
  codeBlockRenderers,
}: {
  block: FlatBlock
  blockIndex: number
  theme: ResolvedTheme
  syntax: SyntaxStyle
  hScrollableBlocksRef?: RefObject<Map<number, TextBufferRenderable>>
  codeBlockRenderers?: Record<string, CodeBlockRenderer>
}): ReactNode {
  const { token, indent, bullet } = block

  // List item line (has bullet)
  if (bullet !== undefined) {
    return <ListLineRenderer block={block} theme={theme} />
  }

  // Regular block token
  switch (token.type) {
    case "heading":
      return <HeadingRenderer token={token as Tokens.Heading} theme={theme} indent={indent} />
    case "paragraph":
      return <ParagraphRenderer token={token as Tokens.Paragraph} theme={theme} indent={indent} />
    case "code":
      return (
        <CodeBlock
          token={token as Tokens.Code}
          blockIndex={blockIndex}
          theme={theme}
          syntax={syntax}
          indent={indent}
          hScrollableBlocksRef={hScrollableBlocksRef}
          renderers={codeBlockRenderers}
        />
      )
    case "blockquote":
      return <BlockquoteRenderer token={token as Tokens.Blockquote} theme={theme} indent={indent} />
    case "table":
      return <MarkdownTableRenderer token={token as Tokens.Table} indent={indent} />
    case "hr":
      return <HorizontalRule theme={theme} indent={indent} />
    case "space":
    case "html":
      return null
    default:
      if ("text" in token && typeof token.text === "string") {
        return (
          <text
            content={token.text}
            style={{
              fg: theme.markdownText,
              marginBottom: 1,
              marginTop: 0,
              marginLeft: 1 + indent,
              marginRight: 1,
            }}
          />
        )
      }
      return null
  }
}

// ---------------------------------------------------------------------------
// List line renderer
// ---------------------------------------------------------------------------

function ListLineRenderer({ block, theme }: { block: FlatBlock; theme: ResolvedTheme }) {
  const { token, indent, bullet, checked } = block
  const checkboxPrefix = checked !== undefined ? (checked ? "[x] " : "[ ] ") : ""

  // Get inline tokens from the text/paragraph token
  const inlineTokens: Token[] = "tokens" in token && Array.isArray(token.tokens) ? token.tokens : []

  const hasText = "text" in token && typeof token.text === "string" && token.text.length > 0
  const hasContent = inlineTokens.length > 0 || hasText

  return (
    <box style={{ marginLeft: 1 + indent, marginRight: 1 }}>
      <text style={{ fg: theme.markdownText }}>
        <span fg={theme.markdownListItem}>{bullet}</span>
        {checkboxPrefix !== "" && (
          <span fg={checked ? theme.accent : theme.textMuted}>{checkboxPrefix}</span>
        )}
        {hasContent &&
          (inlineTokens.length > 0 ? (
            <InlineTokens tokens={inlineTokens} theme={theme} />
          ) : hasText ? (
            "text" in token ? (
              (token as { text: string }).text
            ) : (
              ""
            )
          ) : null)}
      </text>
    </box>
  )
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

function HeadingRenderer({
  token,
  theme,
  indent,
}: {
  token: Tokens.Heading
  theme: ResolvedTheme
  indent: number
}) {
  const headingColors: Record<number, string> = {
    1: theme.markdownHeading,
    2: theme.secondary,
    3: theme.accent,
    4: theme.text,
    5: theme.textMuted,
    6: theme.textMuted,
  }

  const prefixes: Record<number, string> = {
    1: "# ",
    2: "## ",
    3: "### ",
    4: "#### ",
    5: "##### ",
    6: "###### ",
  }

  return (
    <box style={{ marginTop: 1, marginBottom: 1, marginLeft: indent }}>
      <text style={{ fg: headingColors[token.depth] || theme.text }}>
        <span fg={theme.textMuted}>{prefixes[token.depth]}</span>
        <strong>
          <InlineTokens tokens={token.tokens || []} theme={theme} />
        </strong>
      </text>
    </box>
  )
}

function ParagraphRenderer({
  token,
  theme,
  indent,
}: {
  token: Tokens.Paragraph
  theme: ResolvedTheme
  indent: number
}) {
  return (
    <box style={{ marginBottom: 1, marginLeft: 1 + indent, marginRight: 1 }}>
      <text style={{ fg: theme.markdownText }}>
        <InlineTokens tokens={token.tokens || []} theme={theme} />
      </text>
    </box>
  )
}

function BlockquoteRenderer({
  token,
  theme,
  indent,
}: {
  token: Tokens.Blockquote
  theme: ResolvedTheme
  indent: number
}) {
  // Collect inline tokens from blockquote's child paragraphs/text
  const inlineTokens: Token[] = []
  if (token.tokens) {
    for (const child of token.tokens) {
      if ("tokens" in child && Array.isArray(child.tokens)) {
        if (inlineTokens.length > 0) {
          inlineTokens.push({ type: "text", raw: "\n", text: "\n" } as Token)
        }
        inlineTokens.push(...(child.tokens as Token[]))
      } else if ("text" in child && typeof child.text === "string") {
        inlineTokens.push(child)
      }
    }
  }

  return (
    <box
      style={{
        marginTop: 0,
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
        paddingLeft: 2,
      }}
    >
      <text style={{ fg: theme.markdownBlockQuote }} content="│ " />
      <text style={{ fg: theme.textMuted }}>
        <InlineTokens tokens={inlineTokens} theme={theme} />
      </text>
    </box>
  )
}

function MarkdownTableRenderer({ token, indent }: { token: Tokens.Table; indent: number }) {
  const { theme } = useTheme()

  const content: TextTableContent = useMemo(() => {
    const headerRow: TextTableCellContent[] = token.header.map((cell) => {
      const chunks = inlineTokensToChunks(cell.tokens, theme)
      // Wrap header chunks in bold
      return chunks.length > 0
        ? chunks.map((c) => boldChunk(c))
        : [boldChunk(getPlainText(cell.tokens).trim())]
    })
    const dataRows = token.rows.map((row) =>
      row.map((cell) => {
        const chunks = inlineTokensToChunks(cell.tokens, theme)
        return chunks.length > 0
          ? chunks
          : ([
              { __isChunk: true as const, text: getPlainText(cell.tokens) },
            ] as TextTableCellContent)
      }),
    )
    return [headerRow, ...dataRows]
  }, [token, theme])

  return (
    <box style={{ marginLeft: 1 + indent, marginRight: 1, marginBottom: 1 }}>
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
  )
}

function HorizontalRule({ theme, indent }: { theme: ResolvedTheme; indent: number }) {
  return (
    <box style={{ marginTop: 0, marginBottom: 1, marginLeft: 1 + indent, marginRight: 1 }}>
      <text style={{ fg: theme.markdownHorizontalRule }} content={"─".repeat(40)} />
    </box>
  )
}

// ---------------------------------------------------------------------------
// Inline token rendering (React elements)
// ---------------------------------------------------------------------------

function InlineTokens({ tokens, theme }: { tokens: Token[]; theme: ResolvedTheme }): ReactNode {
  const result: ReactNode[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token) continue
    const key = i

    switch (token.type) {
      case "text":
        result.push((token as Tokens.Text).text)
        break
      case "strong":
        result.push(
          <strong key={key}>
            <InlineTokens tokens={(token as Tokens.Strong).tokens || []} theme={theme} />
          </strong>,
        )
        break
      case "em":
        result.push(
          <em key={key}>
            <InlineTokens tokens={(token as Tokens.Em).tokens || []} theme={theme} />
          </em>,
        )
        break
      case "codespan":
        result.push(
          <span key={key} fg={theme.markdownCode} bg={theme.backgroundPanel}>
            {` ${(token as Tokens.Codespan).text} `}
          </span>,
        )
        break
      case "link": {
        const linkToken = token as Tokens.Link
        result.push(
          <u key={key}>
            <a href={linkToken.href} fg={theme.markdownLink}>
              <InlineTokens tokens={linkToken.tokens || []} theme={theme} />
            </a>
          </u>,
        )
        break
      }
      case "del":
        result.push(
          <span key={key} fg={theme.textMuted}>
            {"~"}
            <InlineTokens tokens={(token as Tokens.Del).tokens || []} theme={theme} />
            {"~"}
          </span>,
        )
        break
      case "image": {
        const imgToken = token as Tokens.Image
        result.push(
          <span key={key} fg={theme.textMuted}>
            {imgToken.text || imgToken.href}
          </span>,
        )
        break
      }
      case "br":
        result.push("\n")
        break
      case "escape":
        result.push((token as Tokens.Escape).text)
        break
      case "space":
        result.push(" ")
        break
      default:
        if ("text" in token && typeof (token as { text?: string }).text === "string") {
          result.push((token as { text: string }).text)
        }
        break
    }
  }

  return <>{result}</>
}

// ---------------------------------------------------------------------------
// Inline token rendering (TextChunks — for text-table cells)
// ---------------------------------------------------------------------------

function inlineTokensToChunks(tokens: Token[], theme: ResolvedTheme): TextChunk[] {
  const chunks: TextChunk[] = []

  for (const token of tokens) {
    switch (token.type) {
      case "text":
        chunks.push({ __isChunk: true as const, text: (token as Tokens.Text).text })
        break
      case "strong":
        for (const sub of inlineTokensToChunks((token as Tokens.Strong).tokens || [], theme)) {
          chunks.push(boldChunk(sub))
        }
        break
      case "em":
        for (const sub of inlineTokensToChunks((token as Tokens.Em).tokens || [], theme)) {
          chunks.push(italicChunk(sub))
        }
        break
      case "codespan":
        chunks.push({
          __isChunk: true as const,
          text: ` ${(token as Tokens.Codespan).text} `,
          fg: parseColor(theme.markdownCode),
          bg: parseColor(theme.backgroundPanel),
        })
        break
      case "link": {
        const linkToken = token as Tokens.Link
        for (const sub of inlineTokensToChunks(linkToken.tokens || [], theme)) {
          chunks.push(underlineChunk({ ...sub, fg: parseColor(theme.markdownLink) }))
        }
        break
      }
      case "escape":
        chunks.push({ __isChunk: true as const, text: (token as Tokens.Escape).text })
        break
      default:
        if ("text" in token && typeof (token as { text?: string }).text === "string") {
          chunks.push({ __isChunk: true as const, text: (token as { text: string }).text })
        }
        break
    }
  }

  return chunks
}

// ---------------------------------------------------------------------------
// Plain text extraction (only for width computation, not rendering)
// ---------------------------------------------------------------------------

function getPlainText(tokens: Token[]): string {
  return tokens
    .map((token) => {
      if (token.type === "text") return token.text
      if (token.type === "codespan") return (token as Tokens.Codespan).text
      if ("tokens" in token && token.tokens) return getPlainText(token.tokens as Token[])
      if ("text" in token) return (token as { text: string }).text
      return ""
    })
    .join("")
}
