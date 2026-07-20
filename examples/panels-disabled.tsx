#!/usr/bin/env bun
/**
 * panels-disabled.tsx - Disabled panels and app-owned switch commands.
 *
 * Built-in Tab switching is disabled. Root commands call usePanels().next and
 * previous with h/l; the disabled middle panel stays mounted but is skipped.
 *
 * Run: bun examples/panels-disabled.tsx
 *
 * Controls:
 *   h / l  previous / next enabled panel
 *   q      quit
 */

import type { ReactNode } from "react";
import { useCommand } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import { Panel, PanelGroup, usePanels } from "@tooee/panels";
import { launchCli, useQuitCommand } from "@tooee/shell";
import { useTheme } from "@tooee/themes";

const CustomSwitches = function CustomSwitches(): ReactNode {
  const { activePanelId, next, panelIds, previous } = usePanels();
  const { theme } = useTheme();

  useCommand({
    handler: previous,
    hotkey: "h",
    id: "panels.previous-custom",
    modes: ["cursor"],
    title: "Previous enabled panel",
  });
  useCommand({
    handler: next,
    hotkey: "l",
    id: "panels.next-custom",
    modes: ["cursor"],
    title: "Next enabled panel",
  });

  return (
    <box flexDirection="row" paddingBottom={1}>
      <text content={`active: ${activePanelId ?? "none"}`} />
      <text content={`  all registered: ${panelIds.join(", ")}`} fg={theme.textMuted} />
    </box>
  );
};

const DisabledPanelsDemo = function DisabledPanelsDemo(): ReactNode {
  useQuitCommand();

  return (
    <AppLayout
      titleBar={{ title: "Disabled panels and custom switching" }}
      statusBar={{ items: [{ label: "keys", value: "h/l switch · disabled is skipped · q quit" }] }}
    >
      <box flexDirection="column" width="100%" height="100%">
        <PanelGroup defaultActivePanelId="ready" switchKeys={null}>
          <CustomSwitches />
          <box flexDirection="row" style={{ flexGrow: 1 }}>
            <Panel id="ready" title="Ready" style={{ flexGrow: 1 }}>
              <text content="Enabled: h/l can activate this panel." />
            </Panel>
            <Panel id="locked" title="Locked" disabled style={{ flexGrow: 1 }}>
              <text content="Disabled: mounted and visible, but never activated." />
            </Panel>
            <Panel id="done" title="Done" style={{ flexGrow: 1 }}>
              <text content="Enabled: switching jumps here over Locked." />
            </Panel>
          </box>
        </PanelGroup>
      </box>
    </AppLayout>
  );
};

if (import.meta.main) {
  await launchCli(<DisabledPanelsDemo />);
}
