import { useTheme } from "../theme.tsx"

interface StatusBarProps {
  items: StatusBarItem[]
}

export interface StatusBarItem {
  label: string
  value?: string
}

export function StatusBar({ items }: StatusBarProps) {
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
      {items.map((item, index) => (
        <box key={index} style={{ marginRight: 2, flexDirection: "row" }}>
          <text content={item.label} style={{ fg: theme.textMuted }} />
          {item.value && <text content={` ${item.value}`} style={{ fg: theme.text }} />}
        </box>
      ))}
    </box>
  )
}
