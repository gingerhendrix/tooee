import { marked, type Token, type Tokens } from "marked"
import type { ReactNode } from "react"
import { useTheme, type ResolvedTheme } from "../theme.tsx"
import type { SyntaxStyle } from "@opentui/core"

interface MarkdownViewProps {
  content: string
}

export function MarkdownView({ content }: MarkdownViewProps) {
  const { theme, syntax } = useTheme()
  const tokens = marked.lexer(content)
  return <TokenList tokens={tokens} theme={theme} syntax={syntax} />
}

function TokenList({ tokens, theme, syntax }: { tokens: Token[]; theme: ResolvedTheme; syntax: SyntaxStyle }) {
  return (
    <box style={{ flexDirection: "column" }}>
      {tokens.map((token, index) => (
        <TokenRenderer key={index} token={token} theme={theme} syntax={syntax} />
      ))}
    </box>
  )
}

function TokenRenderer({ token, theme, syntax }: { token: Token; theme: ResolvedTheme; syntax: SyntaxStyle }): ReactNode {
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
    case "hr":
      return <HorizontalRule theme={theme} />
    case "space":
      return <box style={{ height: 1 }} />
    case "html":
      return null
    default:
      if ("text" in token && typeof token.text === "string") {
        return (
          <text
            content={token.text}
            style={{ fg: theme.markdownText, marginBottom: 1 }}
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
    <box style={{ marginBottom: 1 }}>
      <text style={{ fg: theme.markdownText }}>
        <InlineTokens tokens={token.tokens || []} theme={theme} />
      </text>
    </box>
  )
}

function CodeBlockRenderer({ token, theme, syntax }: { token: Tokens.Code; theme: ResolvedTheme; syntax: SyntaxStyle }) {
  return (
    <box
      style={{
        marginTop: 1,
        marginBottom: 1,
        border: true,
        borderColor: theme.borderSubtle,
        backgroundColor: theme.backgroundElement,
        padding: 1,
        flexDirection: "column",
      }}
    >
      {token.lang && (
        <text content={token.lang} style={{ fg: theme.textMuted, marginBottom: 1 }} />
      )}
      <code
        content={token.text}
        filetype={token.lang}
        syntaxStyle={syntax}
      />
    </box>
  )
}

function BlockquoteRenderer({ token, theme }: { token: Tokens.Blockquote; theme: ResolvedTheme }) {
  const quoteText = token.tokens
    ? token.tokens
        .map((t) => {
          const innerTokens =
            "tokens" in t ? (t as { tokens?: Token[] }).tokens : undefined
          const textContent = "text" in t ? (t as { text?: string }).text : ""
          return getPlainText(innerTokens || []) || textContent || ""
        })
        .join("\n")
    : ""

  return (
    <box style={{ marginTop: 1, marginBottom: 1, paddingLeft: 2 }}>
      <text style={{ fg: theme.markdownBlockQuote }} content="│ " />
      <text style={{ fg: theme.textMuted }} content={quoteText} />
    </box>
  )
}

function ListRenderer({ token, theme }: { token: Tokens.List; theme: ResolvedTheme }) {
  return (
    <box style={{ marginBottom: 1, marginLeft: 2, flexDirection: "column" }}>
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
            return (
              <text key={idx} style={{ fg: theme.markdownText }} content={token.text} />
            )
          }
          return null
        })}
      </box>
    </box>
  )
}

function HorizontalRule({ theme }: { theme: ResolvedTheme }) {
  return (
    <box style={{ marginTop: 1, marginBottom: 1 }}>
      <text style={{ fg: theme.markdownHorizontalRule }} content={"─".repeat(40)} />
    </box>
  )
}

function getPlainText(tokens: Token[]): string {
  return tokens
    .map((token) => {
      if (token.type === "text") return token.text
      if (token.type === "codespan") return (token as Tokens.Codespan).text
      if ("tokens" in token && token.tokens)
        return getPlainText(token.tokens as Token[])
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
          <strong key={key}>
            {getPlainText((token as Tokens.Strong).tokens || [])}
          </strong>,
        )
        break
      case "em":
        result.push(
          <em key={key}>{getPlainText((token as Tokens.Em).tokens || [])}</em>,
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
        if (
          "text" in token &&
          typeof (token as { text?: string }).text === "string"
        ) {
          result.push((token as { text: string }).text)
        }
        break
    }
  }

  return <>{result}</>
}
