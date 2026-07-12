import { useTheme } from "@tooee/themes";

interface TitleBarProps {
  title: string;
  subtitle?: string;
}

export const TitleBar = function TitleBar({ title, subtitle }: TitleBarProps): React.ReactNode {
  const { theme } = useTheme();
  return (
    <box
      style={{
        backgroundColor: theme.backgroundPanel,
        flexDirection: "row",
        flexShrink: 0,
        padding: 0,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text content={title} style={{ fg: theme.primary }} />
      {subtitle && <text content={` — ${subtitle}`} style={{ fg: theme.textMuted }} />}
    </box>
  );
};
