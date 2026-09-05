import { useMemo } from "react";
import type { ReactNode } from "react";
import { useTheme } from "@tooee/themes";
import { Chooser } from "./chooser/chooser.js";
import { ChooseHighlightedText } from "./chooser/choose-highlighted-text.js";
import type { ChooseItem } from "./chooser/types.js";

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

export const CommandPalette = function CommandPalette({
  commands,
  onSelect,
  onClose,
}: CommandPaletteProps): ReactNode {
  const { theme } = useTheme();
  const entriesById = useMemo(
    () => new Map(commands.map((entry) => [entry.id, entry])),
    [commands],
  );
  const items = useMemo<ChooseItem[]>(
    () => commands.map((entry) => ({ text: entry.title, value: entry.id })),
    [commands],
  );
  const handleSelect = (item: ChooseItem): void => {
    if (item.value !== undefined) {
      onSelect(item.value);
    }
  };

  return (
    <Chooser
      items={items}
      commandScope="command-palette"
      prompt={<text content=":" fg={theme.accent} />}
      placeholder="Filter commands..."
      onCancel={onClose}
      onSelect={handleSelect}
      renderItem={({ item, positions }): ReactNode => {
        const entry = item.value === undefined ? undefined : entriesById.get(item.value);
        return (
          <>
            <text fg={theme.text} style={{ flexGrow: 1 }}>
              {(entry?.icon?.length ?? 0) > 0 && (
                <span fg={theme.textMuted}>{`${entry?.icon} `}</span>
              )}
              <ChooseHighlightedText
                text={item.text}
                positions={positions}
                highlightColor={theme.warning}
              />
            </text>
            {(entry?.hotkey?.length ?? 0) > 0 && (
              <text content={entry?.hotkey} fg={theme.textMuted} />
            )}
            {(entry?.category?.length ?? 0) > 0 && (
              <text content={` ${entry?.category}`} fg={theme.textMuted} />
            )}
          </>
        );
      }}
    />
  );
};
