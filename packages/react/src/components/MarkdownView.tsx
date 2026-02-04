import { marked, type Token, type Tokens } from "marked"
import type { ReactNode } from "react"
import { useTheme, type ResolvedTheme } from "../theme.tsx"
import type { SyntaxStyle } from "@opentui/core"
import { Table } from "./Table.tsx"

interface MarkdownViewProps {
  content: string
  activeBlock?: number
  selectedBlocks?: { start: number; end: number }
  matchingBlocks?: Set<number>
  currentMatchBlock?: number
}

export function MarkdownView({
  content,
  activeBlock,
  selectedBlocks,
  matchingBlocks,
  currentMatchBlock,
}: MarkdownViewProps) {
  const { theme, syntax } = useTheme()
  const tokens = marked.lexer(content)
  const blocks = tokens.filter((t) => t.type !== "space")

  return (
    <box style={{ flexDirection: "column" }}>
      {blocks.map((token, index) => {
        const { accent: accentColor, background: bgColor } = getBlockStyle(
          index,
          theme,
          activeBlock,
          selectedBlocks,
          matchingBlocks,
          currentMatchBlock,
        )
        const blockContent = (
          <TokenRenderer key={index} token={token} theme={theme} syntax={syntax} />
        )

        if (accentColor) {
          return (
            <box
              key={index}
              style={{ flexDirection: "row" }}
              backgroundColor={bgColor ?? undefined}
            >
              <text content="▎" fg={accentColor} />
              <box style={{ flexGrow: 1, flexDirection: "column" }}>{blockContent}</box>
            </box>
          )
        }

        return <box key={index}>{blockContent}</box>
      })}
    </box>
  )
}

function getBlockStyle(
  index: number,
  theme: ResolvedTheme,
  activeBlock?: number,
  selectedBlocks?: { start: number; end: number },
  matchingBlocks?: Set<number>,
  currentMatchBlock?: number,
): { accent: string | null; background: string | null } {
  // Priority: cursor > current match > match > selection
  if (activeBlock === index) return { accent: theme.primary, background: theme.backgroundElement }
  if (currentMatchBlock === index) return { accent: theme.accent, background: null }
  if (matchingBlocks?.has(index)) return { accent: theme.warning, background: null }
  if (selectedBlocks && index >= selectedBlocks.start && index <= selectedBlocks.end) {
    return { accent: theme.secondary, background: theme.backgroundPanel }
  }
  return { accent: null, background: null }
}

function TokenRenderer({
  token,
  theme,
  syntax,
}: {
  token: Token
  theme: ResolvedTheme
  syntax: SyntaxStyle
}): ReactNode {
  switch (token.type) {
    case "heading":
      return <HeadingRenderer token={token as Tokens.Heading} theme={theme} />
    case "paragraph":
      return <ParagraphRenderer token={token as Tokens.Paragraph} theme={theme} />
    case "code":
      return <CodeBlockRenderer token={token as Tokens.Code} theme={theme} syntax={syntax} />
    case "blockquote":
      return <BlockquoteRenderer token={token as Tokens.Blockquote} theme={theme} />
    case "list":
      return <ListRenderer token={token as Tokens.List} theme={theme} />
    case "table":
      return <MarkdownTableRenderer token={token as Tokens.Table} theme={theme} />
    case "hr":
      return <HorizontalRule theme={theme} />
    case "space":
      return null
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
              marginLeft: 1,
              marginRight: 1,
            }}
          />
        )
      }
      return null
  }
}

function HeadingRenderer({ token, theme }: { token: Tokens.Heading; theme: ResolvedTheme }) {
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

  const headingText = getPlainText(token.tokens || [])

  return (
    <box style={{ marginTop: 1, marginBottom: 1 }}>
      <text style={{ fg: headingColors[token.depth] || theme.text }}>
        <span fg={theme.textMuted}>{prefixes[token.depth]}</span>
        <strong>{headingText}</strong>
      </text>
    </box>
  )
}

function ParagraphRenderer({ token, theme }: { token: Tokens.Paragraph; theme: ResolvedTheme }) {
  return (
    <box style={{ marginBottom: 1, marginLeft: 1, marginRight: 1 }}>
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
}: {
  token: Tokens.Code
  theme: ResolvedTheme
  syntax: SyntaxStyle
}) {
  return (
    <box
      style={{
        marginTop: 0,
        marginBottom: 1,
        marginLeft: 1,
        marginRight: 1,
        border: true,
        borderColor: theme.border,
        backgroundColor: theme.backgroundElement,
        flexDirection: "column",
      }}
    >
      <code content={token.text} filetype={token.lang} syntaxStyle={syntax} />
    </box>
  )
}

function BlockquoteRenderer({ token, theme }: { token: Tokens.Blockquote; theme: ResolvedTheme }) {
  const quoteText = token.tokens
    ? token.tokens
        .map((t) => {
          const innerTokens = "tokens" in t ? (t as { tokens?: Token[] }).tokens : undefined
          const textContent = "text" in t ? (t as { text?: string }).text : ""
          return getPlainText(innerTokens || []) || textContent || ""
        })
        .join("\n")
    : ""

  return (
    <box style={{ marginTop: 0, marginBottom: 1, marginLeft: 1, marginRight: 1, paddingLeft: 2 }}>
      <text style={{ fg: theme.markdownBlockQuote }} content="│ " />
      <text style={{ fg: theme.textMuted }} content={quoteText} />
    </box>
  )
}

function ListRenderer({ token, theme }: { token: Tokens.List; theme: ResolvedTheme }) {
  return (
    <box style={{ marginBottom: 1, marginLeft: 3, marginRight: 1, flexDirection: "column" }}>
      {token.items.map((item, index) => (
        <ListItemRenderer
          key={index}
          item={item}
          ordered={token.ordered}
          index={index + (token.start || 1)}
          theme={theme}
        />
      ))}
    </box>
  )
}

function ListItemRenderer({
  item,
  ordered,
  index,
  theme,
}: {
  item: Tokens.ListItem
  ordered: boolean
  index: number
  theme: ResolvedTheme
}) {
  const bullet = ordered ? `${index}. ` : "- "
  const itemContent = item.tokens || []

  return (
    <box style={{ flexDirection: "row" }}>
      <text style={{ fg: theme.markdownListItem }} content={bullet} />
      <box style={{ flexShrink: 1, flexDirection: "column" }}>
        {itemContent.map((token, idx) => {
          if (token.type === "text" && "tokens" in token && token.tokens) {
            return (
              <text key={idx} style={{ fg: theme.markdownText }}>
                <InlineTokens tokens={token.tokens} theme={theme} />
              </text>
            )
          }
          if (token.type === "paragraph" && token.tokens) {
            return (
              <text key={idx} style={{ fg: theme.markdownText }}>
                <InlineTokens tokens={token.tokens} theme={theme} />
              </text>
            )
          }
          if ("text" in token && typeof token.text === "string") {
            return <text key={idx} style={{ fg: theme.markdownText }} content={token.text} />
          }
          return null
        })}
      </box>
    </box>
  )
}

function MarkdownTableRenderer({
  token,
  theme: _theme,
}: {
  token: Tokens.Table
  theme: ResolvedTheme
}) {
  const headers = token.header.map((cell) => getPlainText(cell.tokens))
  const rows = token.rows.map((row) => row.map((cell) => getPlainText(cell.tokens)))
  return <Table headers={headers} rows={rows} />
}

function HorizontalRule({ theme }: { theme: ResolvedTheme }) {
  return (
    <box style={{ marginTop: 0, marginBottom: 1, marginLeft: 1, marginRight: 1 }}>
      <text style={{ fg: theme.markdownHorizontalRule }} content={"─".repeat(40)} />
    </box>
  )
}

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
          <strong key={key}>{getPlainText((token as Tokens.Strong).tokens || [])}</strong>,
        )
        break
      case "em":
        result.push(<em key={key}>{getPlainText((token as Tokens.Em).tokens || [])}</em>)
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
              {getPlainText(linkToken.tokens || [])}
            </a>
          </u>,
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
