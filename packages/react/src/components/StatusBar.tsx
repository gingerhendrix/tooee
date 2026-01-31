interface StatusBarProps {
  items: StatusBarItem[]
}

export interface StatusBarItem {
  label: string
  value?: string
}

export function StatusBar({ items }: StatusBarProps) {
  return (
    <box
      style={{
        flexDirection: "row",
        backgroundColor: "#1f2335",
        padding: 0,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      {items.map((item, index) => (
        <box key={index} style={{ marginRight: 2, flexDirection: "row" }}>
          <text content={item.label} style={{ fg: "#565f89" }} />
          {item.value && (
            <text content={` ${item.value}`} style={{ fg: "#c0caf5" }} />
          )}
        </box>
      ))}
    </box>
  )
}
