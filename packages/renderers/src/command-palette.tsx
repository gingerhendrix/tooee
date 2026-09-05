import { useState, useMemo, useCallback } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@tooee/commands";
import { useTheme, CloseButton } from "@tooee/themes";
import { rankBy } from "@tooee/fuzzy";

export interface CommandPaletteEntry {
  id: string;
  title: string;
  hotkey?: string;
  category?: string;
  icon?: string;
}

interface CommandPaletteProps {
  commands: CommandPaletteEntry[];
  onSelect: (commandId: string) => void;
  onClose: () => void;
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

export const CommandPalette = function CommandPalette({
  commands,
  onSelect,
  onClose,
}: CommandPaletteProps): ReactNode {
  const { theme } = useTheme();
  const [filter, setFilter] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(
    () => rankBy(commands, filter, (entry) => entry.title),
    [commands, filter],
  );

  const handleSelect = useCallback(() => {
    const item = matches[activeIndex]?.item;
    if (item !== undefined) {
      onSelect(item.id);
    }
  }, [matches, activeIndex, onSelect]);

  const moveUp = useCallback(() => {
    setActiveIndex((i) => Math.max(0, i - 1));
  }, []);

  const moveDown = useCallback(() => {
    setActiveIndex((i) => Math.min(matches.length - 1, i + 1));
  }, [matches.length]);

  useCommand({
    handler: onClose,
    hidden: true,
    hotkey: "Escape",
    id: "command-palette:close",
    modes: ["insert", "cursor"],
    title: "Close command palette",
  });
  useCommand({
    handler: handleSelect,
    hidden: true,
    hotkey: "Enter",
    id: "command-palette:select",
    modes: ["insert", "cursor"],
    title: "Run selected command",
  });
  useCommand({
    handler: moveUp,
    hidden: true,
    hotkey: "up",
    id: "command-palette:move-up",
    modes: ["insert", "cursor"],
    title: "Move up",
  });
  useCommand({
    handler: moveDown,
    hidden: true,
    hotkey: "down",
    id: "command-palette:move-down",
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
        <text content=":" fg={theme.accent} />
        <input
          focused
          placeholder="Filter commands..."
          onSubmit={handleSelect}
          onInput={(value: string) => {
            setFilter(value);
            setActiveIndex(0);
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

      {/* Separator */}
      <box height={1} width="100%" backgroundColor={theme.border} />

      {/* Command list */}
      <scrollbox focused={false} style={{ flexGrow: 1 }}>
        {matches.map(
          (match, i): ReactNode => (
            <box
              key={match.item.id}
              flexDirection="row"
              paddingLeft={1}
              paddingRight={1}
              height={1}
              backgroundColor={i === activeIndex ? theme.backgroundElement : undefined}
              onMouseDown={(event) => {
                // Left-click runs the entry — same code path as Enter.
                if (event.button !== 0) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                onSelect(match.item.id);
              }}
            >
              <HighlightedTitle title={match.item.title} positions={match.positions} />
              {(match.item.hotkey?.length ?? 0) > 0 && (
                <text content={match.item.hotkey} fg={theme.textMuted} />
              )}
              {(match.item.category?.length ?? 0) > 0 && (
                <text content={` ${match.item.category}`} fg={theme.textMuted} />
              )}
            </box>
          ),
        )}
      </scrollbox>
    </box>
  );
};
