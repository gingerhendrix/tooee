import { useTheme } from "@tooee/themes"

export interface SearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  onSubmit: () => void
  onCancel: () => void
  matchCount?: number
  currentMatch?: number
}

export function SearchBar({
  query,
  onQueryChange,
  onSubmit,
  onCancel: _onCancel,
  matchCount,
  currentMatch,
}: SearchBarProps) {
  const { theme } = useTheme()

  const matchDisplay =
    matchCount !== undefined && matchCount > 0
      ? `${(currentMatch ?? 0) + 1}/${matchCount}`
      : matchCount === 0 && query.length > 0
        ? "No matches"
        : ""

  return (
    <box
      style={{
        flexDirection: "row",
        flexShrink: 0,
        backgroundColor: theme.backgroundPanel,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text content="/" style={{ fg: theme.accent }} />
      <input
        value={query}
        focused
        onInput={onQueryChange}
        onSubmit={onSubmit}
        backgroundColor="transparent"
        focusedBackgroundColor="transparent"
        textColor={theme.text}
        cursorColor={theme.accent}
        cursorStyle={{ style: "line", blinking: true }}
        style={{ flexGrow: 1 }}
      />
      {matchDisplay ? <text content={` ${matchDisplay}`} style={{ fg: theme.textMuted }} /> : null}
    </box>
  )
}
