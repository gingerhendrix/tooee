/** Title, description, dependencies, and install command for one component. */

import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import { installCommand } from "../data/registry.js";
import type { ComponentEntry } from "../data/registry.js";
import { DETAIL_TABS } from "./tabs.js";
import type { DetailTab } from "./tabs.js";

export interface DetailHeaderProps {
  entry: ComponentEntry;
  tab: DetailTab;
}

const listOrNone = function listOrNone(values: readonly string[]): string {
  return values.length === 0 ? "none" : values.join(", ");
};

export const DetailHeader = function DetailHeader({ entry, tab }: DetailHeaderProps): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column" flexShrink={0} paddingLeft={1} paddingRight={1}>
      <text>
        <strong fg={theme.primary}>{entry.title}</strong>
        <span fg={theme.textMuted}>{`  ${entry.category}`}</span>
      </text>
      <text content={entry.description} fg={theme.text} />
      <text>
        <span fg={theme.textMuted}>{"npm deps   "}</span>
        <span fg={theme.text}>{listOrNone(entry.dependencies)}</span>
      </text>
      <text>
        <span fg={theme.textMuted}>{"registry   "}</span>
        <span fg={theme.text}>{listOrNone(entry.registryDependencies)}</span>
      </text>
      <text>
        <span fg={theme.textMuted}>{"install    "}</span>
        <span fg={theme.success}>{installCommand(entry)}</span>
        <span fg={theme.textMuted}>{"  (y copies)"}</span>
      </text>
      <text marginTop={1}>
        {DETAIL_TABS.map((item): ReactNode => {
          const active = item.id === tab;

          return (
            <span
              key={item.id}
              fg={active ? theme.background : theme.textMuted}
              bg={active ? theme.primary : undefined}
            >
              {` ${item.hotkey} ${item.label} `}
            </span>
          );
        })}
      </text>
    </box>
  );
};
