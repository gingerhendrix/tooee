import { useTheme } from "../theme.tsx"

interface CodeViewProps {
  content: string
  language?: string
  showLineNumbers?: boolean
}

export function CodeView({ content, language, showLineNumbers = true }: CodeViewProps) {
  const { syntax, theme } = useTheme()

  const codeElement = (
    <code
      content={content}
      filetype={language}
      syntaxStyle={syntax}
    />
  )

  return (
    <box
      style={{
        flexDirection: "column",
        border: true,
        borderColor: theme.borderSubtle,
        backgroundColor: theme.backgroundElement,
        padding: 1,
      }}
    >
      {language && (
        <text content={language} style={{ fg: theme.textMuted, marginBottom: 1 }} />
      )}
      {showLineNumbers ? (
        <line-number
          fg={theme.textMuted}
          bg={theme.backgroundElement}
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
