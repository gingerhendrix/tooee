import { marked, type Token, type Tokens } from "marked"
import type { ReactNode } from "react"
import { getDefaultSyntaxStyle } from "../theme.tsx"

interface MarkdownViewProps {
  content: string
}

export function MarkdownView({ content }: MarkdownViewProps) {
  const tokens = marked.lexer(content)
  return <TokenList tokens={tokens} />
}

function TokenList({ tokens }: { tokens: Token[] }) {
  return (
    <box style={{ flexDirection: "column" }}>
      {tokens.map((token, index) => (
        <TokenRenderer key={index} token={token} />
      ))}
    </box>
  )
}

function TokenRenderer({ token }: { token: Token }): ReactNode {
  switch (token.type) {
    case "heading":
      return <HeadingRenderer token={token as Tokens.Heading} />
    case "paragraph":
      return <ParagraphRenderer token={token as Tokens.Paragraph} />
    case "code":
      return <CodeBlockRenderer token={token as Tokens.Code} />
    case "blockquote":
      return <BlockquoteRenderer token={token as Tokens.Blockquote} />
    case "list":
      return <ListRenderer token={token as Tokens.List} />
    case "hr":
      return <HorizontalRule />
    case "space":
      return <box style={{ height: 1 }} />
    case "html":
      return null
    default:
      if ("text" in token && typeof token.text === "string") {
        return (
          <text
            content={token.text}
            style={{ fg: "#c0caf5", marginBottom: 1 }}
          />
        )
      }
      return null
  }
}

function HeadingRenderer({ token }: { token: Tokens.Heading }) {
  const headingColors: Record<number, string> = {
    1: "#7aa2f7",
    2: "#bb9af7",
    3: "#7dcfff",
    4: "#c0caf5",
    5: "#a9b1d6",
    6: "#9aa5ce",
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
      <text style={{ fg: headingColors[token.depth] || "#c0caf5" }}>
        <span fg="#565f89">{prefixes[token.depth]}</span>
        <strong>{headingText}</strong>
      </text>
    </box>
  )
}

function ParagraphRenderer({ token }: { token: Tokens.Paragraph }) {
  return (
    <box style={{ marginBottom: 1 }}>
      <text style={{ fg: "#c0caf5" }}>
        <InlineTokens tokens={token.tokens || []} />
      </text>
    </box>
  )
}

function CodeBlockRenderer({ token }: { token: Tokens.Code }) {
  const syntaxStyle = getDefaultSyntaxStyle()

  return (
    <box
      style={{
        marginTop: 1,
        marginBottom: 1,
        border: true,
        borderColor: "#414868",
        backgroundColor: "#16161e",
        padding: 1,
        flexDirection: "column",
      }}
    >
      {token.lang && (
        <text content={token.lang} style={{ fg: "#565f89", marginBottom: 1 }} />
      )}
      <code
        content={token.text}
        filetype={token.lang}
        syntaxStyle={syntaxStyle}
      />
    </box>
  )
}

function BlockquoteRenderer({ token }: { token: Tokens.Blockquote }) {
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
      <text style={{ fg: "#7aa2f7" }} content="│ " />
      <text style={{ fg: "#9aa5ce" }} content={quoteText} />
    </box>
  )
}

function ListRenderer({ token }: { token: Tokens.List }) {
  return (
    <box style={{ marginBottom: 1, marginLeft: 2, flexDirection: "column" }}>
      {token.items.map((item, index) => (
        <ListItemRenderer
          key={index}
          item={item}
          ordered={token.ordered}
          index={index + (token.start || 1)}
        />
      ))}
    </box>
  )
}

function ListItemRenderer({
  item,
  ordered,
  index,
}: {
  item: Tokens.ListItem
  ordered: boolean
  index: number
}) {
  const bullet = ordered ? `${index}. ` : "- "
  const itemContent = item.tokens || []

  return (
    <box style={{ flexDirection: "row" }}>
      <text style={{ fg: "#7aa2f7" }} content={bullet} />
      <box style={{ flexShrink: 1, flexDirection: "column" }}>
        {itemContent.map((token, idx) => {
          if (token.type === "text" && "tokens" in token && token.tokens) {
            return (
              <text key={idx} style={{ fg: "#c0caf5" }}>
                <InlineTokens tokens={token.tokens} />
              </text>
            )
          }
          if (token.type === "paragraph" && token.tokens) {
            return (
              <text key={idx} style={{ fg: "#c0caf5" }}>
                <InlineTokens tokens={token.tokens} />
              </text>
            )
          }
          if ("text" in token && typeof token.text === "string") {
            return (
              <text key={idx} style={{ fg: "#c0caf5" }} content={token.text} />
            )
          }
          return null
        })}
      </box>
    </box>
  )
}

function HorizontalRule() {
  return (
    <box style={{ marginTop: 1, marginBottom: 1 }}>
      <text style={{ fg: "#414868" }} content={"─".repeat(40)} />
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

function InlineTokens({ tokens }: { tokens: Token[] }): ReactNode {
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
          <span key={key} fg="#9ece6a" bg="#1f2335">
            {` ${(token as Tokens.Codespan).text} `}
          </span>,
        )
        break
      case "link": {
        const linkToken = token as Tokens.Link
        result.push(
          <u key={key}>
            <a href={linkToken.href} fg="#7aa2f7">
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
