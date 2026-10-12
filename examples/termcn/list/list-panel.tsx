/** Components panel body: the list, or the registry's loading or error state. */

import { usePanels } from "@tooee/panels";
import { useTheme } from "@tooee/themes";
import type { ReactNode } from "react";

import type { Loaded } from "../data/client.js";
import type { ComponentEntry } from "../data/registry.js";
import type { Resource } from "../use-resource.js";
import { ComponentList } from "./component-list.js";

export interface ListPanelProps {
  registry: Resource<Loaded<ComponentEntry[]>>;
  onActiveChange: (entry: ComponentEntry | undefined) => void;
}

export const ListPanel = function ListPanel({
  registry,
  onActiveChange,
}: ListPanelProps): ReactNode {
  const { theme } = useTheme();
  const { activate } = usePanels();

  if (registry.status === "error") {
    return (
      <box flexDirection="column" paddingLeft={1} paddingRight={1}>
        <text content="Could not load the termcn registry." fg={theme.error} />
        <text content={registry.error} fg={theme.textMuted} />
      </box>
    );
  }

  if (registry.status !== "ready") {
    return (
      <box paddingLeft={1}>
        <text content="Loading termcn.dev/r/registry.json..." fg={theme.textMuted} />
      </box>
    );
  }

  return (
    <ComponentList
      entries={registry.value.value}
      onActiveChange={onActiveChange}
      onOpen={() => {
        activate("detail");
      }}
    />
  );
};
