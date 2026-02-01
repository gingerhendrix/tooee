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
      }}
    >
      {showLineNumbers ? (
        <line-number
          key={theme.textMuted + theme.backgroundElement}
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
