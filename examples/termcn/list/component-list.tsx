/**
 * Filterable component list. Without a filter the rows keep registry order
 * with a header for each category. With a filter the rows follow the fuzzy
 * rank, and each row shows its category instead.
 */

import { ChooseFilter, ChooseHighlightedText, ChooseList, useChoose } from "@tooee/choose";
import type { ChooseItem, ChooseItemRenderContext } from "@tooee/choose";
import { useTheme } from "@tooee/themes";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { ComponentEntry } from "../data/registry.js";

export interface ComponentListProps {
  entries: readonly ComponentEntry[];
  onActiveChange: (entry: ComponentEntry | undefined) => void;
  onOpen: () => void;
}

const toItem = function toItem(entry: ComponentEntry): ChooseItem {
  return { description: entry.category, text: entry.name, value: entry.name };
};

export const ComponentList = function ComponentList({
  entries,
  onActiveChange,
  onOpen,
}: ComponentListProps): ReactNode {
  const { theme } = useTheme();
  const items = useMemo(() => entries.map(toItem), [entries]);
  const byName = useMemo(() => new Map(entries.map((entry) => [entry.name, entry])), [entries]);

  const choose = useChoose({
    commandScope: "components",
    onActiveChange: (item) => {
      onActiveChange(item?.value === undefined ? undefined : byName.get(item.value));
    },
    onSubmit: onOpen,
    source: items,
  });

  const filtering = choose.state.filterQuery !== "";

  const renderItem = (context: ChooseItemRenderContext): ReactNode => {
    const category = context.item.description ?? "";
    const previous = choose.state.matches[context.index - 1]?.item.description;
    const showHeader = !filtering && previous !== category;

    return (
      <box flexDirection="column" flexGrow={1}>
        {showHeader && (
          <box
            height={1}
            backgroundColor={theme.backgroundPanel}
            marginTop={context.index === 0 ? 0 : 1}
          >
            <text content={category.toUpperCase()} fg={theme.accent} />
          </box>
        )}
        <text fg={context.isActive ? theme.primary : theme.text}>
          <ChooseHighlightedText
            text={context.item.text}
            positions={context.positions}
            highlightColor={theme.warning}
          />
          {filtering && <span fg={theme.textMuted}>{`  ${category}`}</span>}
        </text>
      </box>
    );
  };

  return (
    <box flexDirection="column" flexGrow={1}>
      <ChooseFilter choose={choose} placeholder="i to filter" count="ratio" />
      <box height={1} width="100%" backgroundColor={theme.border} />
      <ChooseList choose={choose} renderItem={renderItem} emptyContent="No matching components" />
    </box>
  );
};
