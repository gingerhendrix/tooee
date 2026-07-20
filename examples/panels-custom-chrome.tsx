#!/usr/bin/env bun
/**
 * panels-custom-chrome.tsx - App-owned panel chrome with usePanelState().
 *
 * Panel chrome is disabled, then rebuilt inside each panel from its public
 * state. Click activation is app-owned when chrome="none".
 *
 * Run: bun examples/panels-custom-chrome.tsx
 *
 * Controls:
 *   Tab / Shift+Tab  switch panels
 *   +                increment the active panel's local counter
 *   click a panel    activate it
 *   q                quit
 */

import { useState } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import { Panel, PanelGroup, usePanelState } from "@tooee/panels";
import { launchCli, useQuitCommand } from "@tooee/shell";
import { useTheme } from "@tooee/themes";

const CustomPanel = function CustomPanel({ children }: { children: ReactNode }): ReactNode {
  const { activate, id, isActive, title } = usePanelState();
  const { theme } = useTheme();
  const [count, setCount] = useState(0);

  useCommand({
    handler: () => {
      setCount((current) => current + 1);
    },
    hotkey: "+",
    id: `${id}.increment`,
    modes: ["cursor"],
    title: `Increment ${title ?? id}`,
  });

  return (
    <box
      border
      borderColor={isActive ? theme.accent : theme.borderSubtle}
      backgroundColor={isActive ? theme.backgroundElement : theme.backgroundPanel}
      flexDirection="column"
      onMouseDown={activate}
      paddingLeft={1}
      paddingRight={1}
      style={{ flexGrow: 1 }}
    >
      <text
        content={`${isActive ? "●" : "○"} ${title ?? id}`}
        fg={isActive ? theme.accent : theme.textMuted}
      />
      <text content={`local count: ${count}`} />
      {children}
    </box>
  );
};

const CustomChromeDemo = function CustomChromeDemo(): ReactNode {
  useQuitCommand();

  return (
    <AppLayout
      titleBar={{ title: "Custom panel chrome" }}
      statusBar={{ items: [{ label: "keys", value: "Tab switch · + increment · q quit" }] }}
    >
      <box flexDirection="row" width="100%" height="100%">
        <PanelGroup defaultActivePanelId="preview">
          <Panel id="preview" title="Preview" chrome="none">
            <CustomPanel>
              <text content="The active cue, border, and background are app-defined." />
            </CustomPanel>
          </Panel>
          <Panel id="metadata" title="Metadata" chrome="none">
            <CustomPanel>
              <text content="Each panel keeps this counter while inactive." />
            </CustomPanel>
          </Panel>
        </PanelGroup>
      </box>
    </AppLayout>
  );
};

if (import.meta.main) {
  await launchCli(<CustomChromeDemo />);
}
