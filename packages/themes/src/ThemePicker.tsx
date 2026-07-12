import { useState, useMemo, useCallback } from "react";
import { useCommand } from "@tooee/commands";
import { fuzzyMatch } from "@tooee/fuzzy";
import { useTheme } from "./context.js";
import { CloseButton } from "./CloseButton.js";

export interface ThemePickerEntry {
  id: string;
  title: string;
}

interface ThemePickerProps {
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
}: ThemePickerProps): React.ReactNode {
  const { theme } = useTheme();
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(() => {
    const idx = entries.findIndex((e) => e.id === currentTheme);
    return Math.max(idx, 0);
  });

  const filtered = useMemo(() => {
    if (!filter) {
      return entries;
    }
    const results: { entry: ThemePickerEntry; score: number }[] = [];
    for (const entry of entries) {
      const score = fuzzyMatch(filter, entry.title);
      if (score !== null) {
        results.push({ entry, score });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.map((r) => r.entry);
  }, [entries, filter]);

  const handleSelect = useCallback(() => {
    const item = filtered[activeIndex];
    if (item) {
      onSelect(item.id);
    }
  }, [filtered, activeIndex, onSelect]);

  const navigateTo = useCallback(
    (index: number) => {
      setActiveIndex(index);
      const item = filtered[index];
      if (item) {
        onNavigate(item.id);
      }
    },
    [filtered, onNavigate],
  );

  const moveUp = useCallback(() => {
    navigateTo(Math.max(0, activeIndex - 1));
  }, [activeIndex, navigateTo]);

  const moveDown = useCallback(() => {
    navigateTo(Math.min(filtered.length - 1, activeIndex + 1));
  }, [activeIndex, filtered.length, navigateTo]);

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
    handler: moveUp,
    hidden: true,
    hotkey: "up",
    id: "theme-picker:move-up",
    modes: ["insert", "cursor"],
    title: "Move up",
  });
  useCommand({
    handler: moveDown,
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
      {/* Filter row */}
      <box flexDirection="row" paddingLeft={1} paddingRight={1} height={1}>
        <text content="🎨 " fg={theme.accent} />
        <input
          focused
          placeholder="Filter themes..."
          onSubmit={handleSelect}
          onInput={(value: string) => {
            setFilter(value);
            setActiveIndex(0);
            // Preview first match
            if (!value) {
              if (entries.length > 0) {
                onNavigate(entries[0].id);
              }
            } else {
              const results: { entry: ThemePickerEntry; score: number }[] = [];
              for (const entry of entries) {
                const score = fuzzyMatch(value, entry.title);
                if (score !== null) {
                  results.push({ entry, score });
                }
              }
              results.sort((a, b) => b.score - a.score);
              if (results.length > 0) {
                onNavigate(results[0].entry.id);
              }
            }
          }}
          backgroundColor="transparent"
          focusedBackgroundColor="transparent"
          textColor={theme.text}
          placeholderColor={theme.textMuted}
          cursorColor={theme.accent}
          style={{ flexGrow: 1 }}
        />
        <text content={` ${filtered.length}`} fg={theme.textMuted} />
        <CloseButton onClose={onClose} />
      </box>

      {/* Separator */}
      <box height={1} width="100%" backgroundColor={theme.border} />

      {/* Theme list */}
      <scrollbox focused={false} style={{ flexGrow: 1 }}>
        {filtered.map(
          (entry, i): React.ReactNode => (
            <box
              key={entry.id}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              height={1}
              backgroundColor={i === activeIndex ? theme.backgroundElement : undefined}
              onMouseDown={(event) => {
                // Left-click applies the theme — same code path as Enter.
                if (event.button !== 0) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                onSelect(entry.id);
              }}
            >
              <text content={entry.title} fg={theme.text} style={{ flexGrow: 1 }} />
            </box>
          ),
        )}
      </scrollbox>
    </box>
  );
};
