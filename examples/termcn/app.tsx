/**
 * Root of the termcn browser: a component list panel beside a detail panel.
 * Owns the registry and vendor resources and the root commands.
 */

import { useCommand } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import { Panel, PanelGroup } from "@tooee/panels";
import { useQuitCommand, useThemeCommands } from "@tooee/shell";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { TermcnContext } from "./context.js";
import type { TermcnServices } from "./context.js";
import type { TermcnClient } from "./data/client.js";
import type { ComponentEntry } from "./data/registry.js";
import { DetailPanel } from "./detail/detail-panel.js";
import { ListPanel } from "./list/list-panel.js";
import { readVendorStatus } from "./preview/vendor.js";
import { statusItems } from "./status-items.js";
import { useCopyInstallCommand } from "./use-copy-install.js";
import { useResource } from "./use-resource.js";

export interface TermcnAppProps {
  client: TermcnClient;
  vendorDirectory: string;
}

export const TermcnApp = function TermcnApp({
  client,
  vendorDirectory,
}: TermcnAppProps): ReactNode {
  const registry = useResource("registry", async () => await client.loadRegistry());
  const vendor = useResource("vendor", async () => await readVendorStatus(vendorDirectory));
  const [selected, setSelected] = useState<ComponentEntry | undefined>();

  useQuitCommand();
  useThemeCommands();
  useCopyInstallCommand(selected);
  useCommand({
    handler: registry.reload,
    hotkey: "r",
    id: "termcn.reload-registry",
    modes: ["cursor"],
    title: "Reload the registry",
    when: () => registry.resource.status === "error",
  });

  const componentNames = useMemo(
    () =>
      registry.resource.status === "ready"
        ? registry.resource.value.value.map((entry) => entry.name)
        : [],
    [registry.resource]
  );

  const services = useMemo<TermcnServices>(
    () => ({ client, componentNames, vendor: vendor.resource, vendorDirectory }),
    [client, componentNames, vendor.resource, vendorDirectory]
  );

  return (
    <TermcnContext.Provider value={services}>
      <AppLayout
        titleBar={{ subtitle: "OpenTUI components from termcn.dev", title: "termcn" }}
        statusBar={{ items: statusItems(registry.resource, vendor.resource) }}
      >
        <box flexDirection="row" width="100%" height="100%">
          <PanelGroup defaultActivePanelId="components">
            <Panel id="components" title="Components" style={{ width: 34 }}>
              <ListPanel registry={registry.resource} onActiveChange={setSelected} />
            </Panel>
            <Panel id="detail" title={selected?.title ?? "Detail"} style={{ flexGrow: 1 }}>
              {selected === undefined ? null : <DetailPanel key={selected.name} entry={selected} />}
            </Panel>
          </PanelGroup>
        </box>
      </AppLayout>
    </TermcnContext.Provider>
  );
};
