interface CodeViewProps {
  content: string
  language?: string
  showLineNumbers?: boolean
}

export function CodeView({ content, language, showLineNumbers = true }: CodeViewProps) {
  const lines = content.split("\n")

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
      {lines.map((line, index) => (
        <box key={index} style={{ flexDirection: "row" }}>
          {showLineNumbers && (
            <text
              content={String(index + 1).padStart(4, " ") + " "}
              style={{ fg: "#565f89" }}
            />
          )}
          <text content={line} style={{ fg: "#9ece6a" }} />
        </box>
      ))}
    </box>
  )
}
