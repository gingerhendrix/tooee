/**
 * Detail panel for the selected component: header, then the Preview, Docs,
 * or Source tab. Preview opens first. Docs load on selection, because the
 * preview tab also needs the page's demo list. Source loads the first time its tab opens.
 */

import { useCommand } from "@tooee/commands";
import { useState } from "react";
import type { ReactNode } from "react";

import { useTermcn } from "../context.js";
import type { ComponentEntry } from "../data/registry.js";
import { PreviewTab } from "../preview/preview-tab.js";
import { useResource } from "../use-resource.js";
import { DetailHeader } from "./detail-header.js";
import { DocsTab } from "./docs-tab.js";
import { SourceTab } from "./source-tab.js";
import { DEFAULT_DETAIL_TAB, DETAIL_TABS } from "./tabs.js";
import type { DetailTab } from "./tabs.js";

export interface DetailPanelProps {
  entry: ComponentEntry;
}

const useTabCommands = function useTabCommands(onSelect: (tab: DetailTab) => void): void {
  const [preview, docs, source] = DETAIL_TABS;

  useCommand({
    handler: () => {
      onSelect(preview.id);
    },
    hotkey: preview.hotkey,
    id: "detail.tab-preview",
    modes: ["cursor"],
    title: "Show live preview",
  });
  useCommand({
    handler: () => {
      onSelect(docs.id);
    },
    hotkey: docs.hotkey,
    id: "detail.tab-docs",
    modes: ["cursor"],
    title: "Show docs",
  });
  useCommand({
    handler: () => {
      onSelect(source.id);
    },
    hotkey: source.hotkey,
    id: "detail.tab-source",
    modes: ["cursor"],
    title: "Show source",
  });
};

export const DetailPanel = function DetailPanel({ entry }: DetailPanelProps): ReactNode {
  const { client } = useTermcn();
  const [tab, setTab] = useState<DetailTab>(DEFAULT_DETAIL_TAB);
  const docs = useResource(`docs:${entry.name}`, async () => await client.loadDocs(entry));

  const source = useResource(
    tab === "source" ? `source:${entry.name}` : null,
    async () => await client.loadSource(entry)
  );

  useTabCommands(setTab);
  useCommand({
    handler: () => {
      docs.reload();
      source.reload();
    },
    hotkey: "r",
    id: "detail.reload",
    modes: ["cursor"],
    title: "Reload docs and source",
  });

  const docsPage = docs.resource.status === "ready" ? docs.resource.value.value : null;
  const previews = docsPage?.kind === "page" ? docsPage.previews : [];

  return (
    <box flexDirection="column" flexGrow={1}>
      <DetailHeader entry={entry} tab={tab} />
      <box flexDirection="column" flexGrow={1} marginTop={1}>
        {tab === "preview" && <PreviewTab key={entry.name} entry={entry} previews={previews} />}
        {tab === "docs" && <DocsTab docs={docs.resource} />}
        {tab === "source" && <SourceTab source={source.resource} />}
      </box>
    </box>
  );
};
