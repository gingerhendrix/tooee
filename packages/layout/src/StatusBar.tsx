import { useTheme } from "@tooee/themes";

interface StatusBarProps {
  items: StatusBarItem[];
}

export interface StatusBarItem {
  label: string;
  value?: string;
}

export const StatusBar = function StatusBar({ items }: StatusBarProps): React.ReactNode {
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
      {items.map(
        (item, index): React.ReactNode => (
          <box key={index} style={{ flexDirection: "row", marginRight: 2 }}>
            <text content={item.label} style={{ fg: theme.textMuted }} />
            {(item.value?.length ?? 0) > 0 && (
              <text content={` ${item.value}`} style={{ fg: theme.text }} />
            )}
          </box>
        ),
      )}
    </box>
  );
};
