#!/usr/bin/env bun
/**
 * panels-controlled.tsx - Controlled panel activation with usePanels().
 *
 * The parent owns the active panel id. Number-key commands call the group's
 * public controls, and onActivePanelChange applies each activation request.
 *
 * Run: bun examples/panels-controlled.tsx
 *
 * Controls:
 *   1 / 2 / 3        activate a panel directly
 *   Tab / Shift+Tab  request the next / previous panel
 *   q                quit
 */

import { useState } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import { Panel, PanelGroup, usePanels } from "@tooee/panels";
import { launchCli, useQuitCommand } from "@tooee/shell";
import { useTheme } from "@tooee/themes";

const PANEL_IDS = ["one", "two", "three"] as const;

const ActivatePanelCommand = function ActivatePanelCommand({
  hotkey,
  panelId,
}: {
  hotkey: string;
  panelId: string;
}): null {
  const { activate } = usePanels();
  useCommand({
    handler: () => {
      activate(panelId);
    },
    hotkey,
    id: `panels.activate-${panelId}`,
    modes: ["cursor"],
    title: `Activate panel ${hotkey}`,
  });
  return null;
};

const PanelControls = function PanelControls(): ReactNode {
  const { activePanelId, panelIds } = usePanels();
  const { theme } = useTheme();

  return (
    <>
      <ActivatePanelCommand hotkey="1" panelId="one" />
      <ActivatePanelCommand hotkey="2" panelId="two" />
      <ActivatePanelCommand hotkey="3" panelId="three" />
      <box flexDirection="row" paddingBottom={1}>
        <text content="controlled state: " fg={theme.textMuted} />
        <text content={activePanelId ?? "none"} fg={theme.text} />
        <text content={`  registered: ${panelIds.join(", ")}`} fg={theme.textMuted} />
      </box>
    </>
  );
};

const ControlledPanelsDemo = function ControlledPanelsDemo(): ReactNode {
  const [activePanelId, setActivePanelId] = useState<string>("one");
  useQuitCommand();

  return (
    <AppLayout
      titleBar={{ title: "Controlled panels" }}
      statusBar={{ items: [{ label: "keys", value: "1/2/3 activate · Tab cycle · q quit" }] }}
    >
      <box flexDirection="column" width="100%" height="100%">
        <PanelGroup activePanelId={activePanelId} onActivePanelChange={setActivePanelId}>
          <PanelControls />
          <box flexDirection="row" style={{ flexGrow: 1 }}>
            {PANEL_IDS.map(
              (id, index): ReactNode => (
                <Panel key={id} id={id} title={`Panel ${index + 1}`} style={{ flexGrow: 1 }}>
                  <box paddingLeft={1} paddingRight={1}>
                    <text content={`Parent-controlled content for “${id}”`} />
                  </box>
                </Panel>
              ),
            )}
          </box>
        </PanelGroup>
      </box>
    </AppLayout>
  );
};

if (import.meta.main) {
  await launchCli(<ControlledPanelsDemo />);
}
