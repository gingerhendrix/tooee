import { useTheme } from "@tooee/themes"

interface TitleBarProps {
  title: string
  subtitle?: string
}

export function TitleBar({ title, subtitle }: TitleBarProps) {
  const { theme } = useTheme()
  return (
    <box
      style={{
        flexDirection: "row",
        flexShrink: 0,
        backgroundColor: theme.backgroundPanel,
        padding: 0,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text content={title} style={{ fg: theme.primary }} />
      {subtitle && <text content={` — ${subtitle}`} style={{ fg: theme.textMuted }} />}
    </box>
  )
}
