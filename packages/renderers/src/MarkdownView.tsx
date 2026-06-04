import { marked, type Token, type Tokens } from "marked"
import { useMemo, type ReactNode, type RefObject } from "react"
import { useTheme, type ResolvedTheme } from "@tooee/themes"
import {
  bold as boldChunk,
  italic as italicChunk,
  underline as underlineChunk,
  parseColor,
} from "@opentui/core"
import type { SyntaxStyle, TextTableContent, TextTableCellContent, TextChunk } from "@opentui/core"
import type { MarkState } from "@tooee/marks"
import { DEFAULT_SIGN_COLUMN_WIDTH, type RowDocumentRenderable } from "./RowDocumentRenderable.js"
import { useGutterPalette } from "./useGutterPalette.js"
import { isMermaidFence, renderMermaidForTerminal } from "./mermaid.js"
import "./row-document.js"
import "./text-table.js"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarkdownViewProps {
  content: string
  showLineNumbers?: boolean
  marks?: MarkState
  docRef?: RefObject<RowDocumentRenderable | null>
}

/**
 * A flattened block — all blocks exist at the top level with an indent.
 * Nested structures (lists containing code blocks, etc.) are flattened
 * into sibling blocks with appropriate indentation.
 */
export interface FlatBlock {
  token: Token
  indent: number
  bullet?: string // "- " or "1. " for list item lines
  checked?: boolean // undefined = not a checkbox, true/false = checkbox state
}

// ---------------------------------------------------------------------------
// Token flattening
// ---------------------------------------------------------------------------

export function flattenTokens(tokens: Token[]): FlatBlock[] {
  const result: FlatBlock[] = []
  flattenTokenList(tokens, 0, result)
  return result
}

function flattenTokenList(tokens: Token[], indent: number, result: FlatBlock[]): void {
  for (const token of tokens) {
    if (token.type === "space") continue

    if (token.type === "list") {
      const list = token as Tokens.List
      for (let i = 0; i < list.items.length; i++) {
        const item = list.items[i]
        const bullet = list.ordered ? `${i + (list.start || 1)}. ` : "- "
        flattenListItem(item, indent, bullet, result)
      }
    } else {
      result.push({ token, indent })
    }
  }
}

function flattenListItem(
  item: Tokens.ListItem,
  indent: number,
  bullet: string,
  result: FlatBlock[],
): void {
  const checked = item.checked != null ? item.checked : undefined
  const childTokens = item.tokens || []
  let bulletUsed = false

  for (const token of childTokens) {
    if (token.type === "space" || token.type === "checkbox") continue

    if (token.type === "text" || token.type === "paragraph") {
      // Inline content — attach the bullet to the first one
      result.push({
        token,
        indent,
        bullet: bulletUsed ? undefined : bullet,
        checked: bulletUsed ? undefined : checked,
      })
      bulletUsed = true
    } else if (token.type === "list") {
      // Emit bullet line if nothing preceded this nested list
      if (!bulletUsed) {
        result.push({
          token: { type: "text", raw: "", text: "", tokens: [] } as unknown as Token,
          indent,
          bullet,
          checked,
        })
        bulletUsed = true
      }
      // Nested list — increase indent to align with content after bullet
      const list = token as Tokens.List
      for (let i = 0; i < list.items.length; i++) {
        const subItem = list.items[i]
        const subBullet = list.ordered ? `${i + (list.start || 1)}. ` : "- "
        flattenListItem(subItem, indent + bullet.length, subBullet, result)
      }
    } else {
      // Block content (code, table, blockquote, hr, etc.)
      if (!bulletUsed) {
        result.push({
          token: { type: "text", raw: "", text: "", tokens: [] } as unknown as Token,
          indent,
          bullet,
          checked,
        })
        bulletUsed = true
      }
      // Emit the block indented to align with content after the bullet
      result.push({ token, indent: indent + bullet.length })
    }
  }

  // List item had no content tokens — still emit the bullet
  if (!bulletUsed) {
    result.push({
      token: { type: "text", raw: "", text: "", tokens: [] } as unknown as Token,
      indent,
      bullet,
      checked,
    })
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MarkdownView({
  content,
  showLineNumbers = true,
  marks,
  docRef,
}: MarkdownViewProps) {
  const { theme, syntax } = useTheme()
  const palette = useGutterPalette()
  const tokens = marked.lexer(content)
  const blocks = flattenTokens(tokens)

  const blockElements = blocks.map((block, index) => (
    <FlatBlockRenderer key={index} block={block} theme={theme} syntax={syntax} />
  ))

  return (
    <row-document
      ref={docRef}
      showLineNumbers={showLineNumbers}
      palette={palette}
      decorations={marks?.sets}
      signColumnWidth={DEFAULT_SIGN_COLUMN_WIDTH}
      style={{ flexGrow: 1 }}
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
  theme,
  syntax,
}: {
  block: FlatBlock
  theme: ResolvedTheme
  syntax: SyntaxStyle
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
    case "code": {
      const codeToken = token as Tokens.Code
      if (isMermaidFence(codeToken.lang)) {
        return (
          <MermaidBlockRenderer token={codeToken} theme={theme} syntax={syntax} indent={indent} />
        )
      }

      return <CodeBlockRenderer token={codeToken} theme={theme} syntax={syntax} indent={indent} />
    }
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

function CodeBlockRenderer({
  token,
  theme,
  syntax,
  indent,
}: {
  token: Tokens.Code
  theme: ResolvedTheme
  syntax: SyntaxStyle
  indent: number
}) {
  const lineCount = token.text.split("\n").length
  return (
    <box
      style={{
        marginTop: 0,
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
        border: true,
        borderColor: theme.border,
        backgroundColor: theme.backgroundElement,
        flexDirection: "column",
      }}
    >
      <code
        content={token.text}
        filetype={token.lang}
        syntaxStyle={syntax}
        style={{ height: lineCount }}
      />
    </box>
  )
}

function MermaidBlockRenderer({
  token,
  theme,
  syntax,
  indent,
}: {
  token: Tokens.Code
  theme: ResolvedTheme
  syntax: SyntaxStyle
  indent: number
}) {
  const mermaidTheme = useMemo(
    () => ({
      fg: theme.markdownText,
      border: theme.border,
      line: theme.textMuted,
      arrow: theme.accent,
      accent: theme.accent,
      bg: theme.backgroundElement,
      corner: theme.borderActive,
      junction: theme.borderSubtle,
    }),
    [theme],
  )
  const result = useMemo(
    () => renderMermaidForTerminal(token.text, { mode: "ansi", theme: mermaidTheme }),
    [token.text, mermaidTheme],
  )

  if (!result.ok) {
    return <CodeBlockRenderer token={token} theme={theme} syntax={syntax} indent={indent} />
  }

  const lineCount = result.text.split("\n").length
  return (
    <box
      style={{
        marginTop: 0,
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
        border: true,
        borderColor: theme.border,
        backgroundColor: theme.backgroundElement,
        flexDirection: "column",
      }}
    >
      <text content={result.content} style={{ fg: theme.markdownText, height: lineCount }} />
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
