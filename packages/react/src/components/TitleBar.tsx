interface TitleBarProps {
  title: string
  subtitle?: string
}

export function TitleBar({ title, subtitle }: TitleBarProps) {
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
      <text content={title} style={{ fg: "#7aa2f7" }} />
      {subtitle && (
        <text content={` — ${subtitle}`} style={{ fg: "#565f89" }} />
      )}
    </box>
  )
}
