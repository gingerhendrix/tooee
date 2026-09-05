import { useMemo } from "react";
import type { ReactNode } from "react";
import { Chooser, ChooseHighlightedText } from "@tooee/renderers";
import type { ChooseItem } from "@tooee/renderers";
import { useTheme } from "@tooee/themes";

export interface ThemePickerEntry {
  id: string;
  title: string;
}

export interface ThemePickerProps {
  entries: ThemePickerEntry[];
  currentTheme: string;
  onSelect: (name: string) => void;
  onClose: () => void;
  onNavigate: (name: string) => void;
}

export const ThemePicker = function ThemePicker({
  entries,
  currentTheme,
  onSelect,
  onClose,
  onNavigate,
}: ThemePickerProps): ReactNode {
  const { theme } = useTheme();
  const items = useMemo<ChooseItem[]>(
    () => entries.map((entry) => ({ text: entry.title, value: entry.id })),
    [entries],
  );
  const initialActiveIndex = useMemo(
    () =>
      Math.max(
        0,
        entries.findIndex((entry) => entry.id === currentTheme),
      ),
    [currentTheme, entries],
  );
  const handleSelect = (item: ChooseItem): void => {
    if (item.value !== undefined) {
      onSelect(item.value);
    }
  };

  return (
    <Chooser
      items={items}
      commandScope="theme-picker"
      prompt={<text content="🎨 " fg={theme.accent} />}
      placeholder="Filter themes..."
      initialActiveIndex={initialActiveIndex}
      onActiveChange={(item) => {
        if (item?.value !== undefined) {
          onNavigate(item.value);
        }
      }}
      onCancel={onClose}
      onSelect={handleSelect}
      renderItem={({ item, positions }): ReactNode => (
        <text fg={theme.text} style={{ flexGrow: 1 }}>
          <ChooseHighlightedText
            text={item.text}
            positions={positions}
            highlightColor={theme.warning}
          />
        </text>
      )}
    />
  );
};
