import type { ReactNode } from "react";
import { useTheme } from "@tooee/themes";
import { ChooseFilter } from "./choose-filter.js";
import { ChooseList } from "./choose-list.js";
import type { ChooseListProps } from "./choose-list.js";
import type { ChooseItem } from "./types.js";
import { useChoose } from "./use-choose.js";

export interface ChooserProps {
  items: ChooseItem[];
  commandScope: string;
  prompt: ReactNode;
  placeholder?: string;
  initialActiveIndex?: number;
  onActiveChange?: (item: ChooseItem | undefined) => void;
  onSelect: (item: ChooseItem) => void | Promise<void>;
  onCancel: () => void;
  renderItem?: ChooseListProps["renderItem"];
  emptyContent?: ReactNode;
}

/** Shared modal filtered-list assembly used by shell chooser surfaces. */
export const Chooser = function Chooser({
  items,
  commandScope,
  prompt,
  placeholder,
  initialActiveIndex,
  onActiveChange,
  onSelect,
  onCancel,
  renderItem,
  emptyContent,
}: ChooserProps): ReactNode {
  const { theme } = useTheme();
  const choose = useChoose({
    commandScope,
    escapeToCursor: false,
    initialActiveIndex,
    onActiveChange,
    onCancel,
    onSubmit: async ({ items: selectedItems }) => {
      const [item] = selectedItems;
      if (item !== undefined) {
        await onSelect(item);
      }
    },
    source: items,
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
      <ChooseFilter
        choose={choose}
        prompt={prompt}
        placeholder={placeholder}
        count="matches"
        onClose={onCancel}
      />
      <box height={1} width="100%" backgroundColor={theme.border} />
      <ChooseList
        choose={choose}
        rowClick="submit"
        rowHeight={1}
        renderItem={renderItem}
        emptyContent={emptyContent}
      />
    </box>
  );
};
