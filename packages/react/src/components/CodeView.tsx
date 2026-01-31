import { getDefaultSyntaxStyle } from "../theme.tsx"

interface CodeViewProps {
  content: string
  language?: string
  showLineNumbers?: boolean
}

export function CodeView({ content, language, showLineNumbers = true }: CodeViewProps) {
  const syntaxStyle = getDefaultSyntaxStyle()

  const codeElement = (
    <code
      content={content}
      filetype={language}
      syntaxStyle={syntaxStyle}
    />
  )

  return (
    <box
      style={{
        flexDirection: "column",
        border: true,
        borderColor: "#414868",
        backgroundColor: "#16161e",
        padding: 1,
      }}
    >
      {language && (
        <text content={language} style={{ fg: "#565f89", marginBottom: 1 }} />
      )}
      {showLineNumbers ? (
        <line-number
          fg="#565f89"
          bg="#16161e"
          paddingRight={1}
          showLineNumbers
        >
          {codeElement}
        </line-number>
      ) : (
        codeElement
      )}
    </box>
  )
}
