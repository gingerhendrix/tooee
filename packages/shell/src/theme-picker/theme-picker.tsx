import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@tooee/commands";
import { rankBy } from "@tooee/fuzzy";
import { CloseButton } from "@tooee/layout";
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

const HighlightedTitle = function HighlightedTitle({
  title,
  positions,
}: {
  title: string;
  positions: readonly number[];
}): ReactNode {
  const { theme } = useTheme();
  const highlighted = new Set(positions);
  return (
    <text fg={theme.text} style={{ flexGrow: 1 }}>
      {Array.from(
        title,
        (character, index): ReactNode => (
          <span key={index} fg={highlighted.has(index) ? theme.warning : theme.text}>
            {character}
          </span>
        ),
      )}
    </text>
  );
};

export const ThemePicker = function ThemePicker({
  entries,
  currentTheme,
  onSelect,
  onClose,
  onNavigate,
}: ThemePickerProps): ReactNode {
  const { theme } = useTheme();
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(() => {
    const index = entries.findIndex((entry) => entry.id === currentTheme);
    return Math.max(index, 0);
  });
  const matches = useMemo(() => rankBy(entries, filter, (entry) => entry.title), [entries, filter]);

  const handleSelect = useCallback(() => {
    const item = matches[activeIndex]?.item;
    if (item !== undefined) {
      onSelect(item.id);
    }
  }, [matches, activeIndex, onSelect]);

  const navigateTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const item = matches[index]?.item;
      if (item !== undefined) {
        onNavigate(item.id);
      }
    },
    [matches, onNavigate],
  );

  useCommand({
    handler: onClose,
    hidden: true,
    hotkey: "Escape",
    id: "theme-picker:close",
    modes: ["insert", "cursor"],
    title: "Close theme picker",
  });
  useCommand({
    handler: handleSelect,
    hidden: true,
    hotkey: "Enter",
    id: "theme-picker:select",
    modes: ["insert", "cursor"],
    title: "Select theme",
  });
  useCommand({
    handler: () => {
      navigateTo(Math.max(0, activeIndex - 1));
    },
    hidden: true,
    hotkey: "up",
    id: "theme-picker:move-up",
    modes: ["insert", "cursor"],
    title: "Move up",
  });
  useCommand({
    handler: () => {
      navigateTo(Math.min(matches.length - 1, activeIndex + 1));
    },
    hidden: true,
    hotkey: "down",
    id: "theme-picker:move-down",
    modes: ["insert", "cursor"],
    title: "Move down",
  });

  return (
    <box
      position="absolute"
      left="20%"
      right="20%"
      top={2}
      maxHeight="60%"
      flexDirection="column"
      backgroundColor={theme.backgroundPanel}
      border
      borderColor={theme.border}
    >
      <box flexDirection="row" paddingLeft={1} paddingRight={1} height={1}>
        <text content="🎨 " fg={theme.accent} />
        <input
          focused
          placeholder="Filter themes..."
          onSubmit={handleSelect}
          onInput={(value: string) => {
            const nextMatches = rankBy(entries, value, (entry) => entry.title);
            setFilter(value);
            setActiveIndex(0);
            const first = nextMatches[0]?.item;
            if (first !== undefined) {
              onNavigate(first.id);
            }
          }}
          backgroundColor="transparent"
          focusedBackgroundColor="transparent"
          textColor={theme.text}
          placeholderColor={theme.textMuted}
          cursorColor={theme.accent}
          style={{ flexGrow: 1 }}
        />
        <text content={` ${matches.length}`} fg={theme.textMuted} />
        <CloseButton onClose={onClose} />
      </box>

      <box height={1} width="100%" backgroundColor={theme.border} />

      <scrollbox focused={false} style={{ flexGrow: 1 }}>
        {matches.map(
          (match, index): ReactNode => (
            <box
              key={match.item.id}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              height={1}
              backgroundColor={index === activeIndex ? theme.backgroundElement : undefined}
              onMouseDown={(event) => {
                if (event.button !== 0) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                onSelect(match.item.id);
              }}
            >
              <HighlightedTitle title={match.item.title} positions={match.positions} />
            </box>
          ),
        )}
      </scrollbox>
    </box>
  );
};
