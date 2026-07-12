#!/usr/bin/env bun

import { useMemo, useState } from "react";
import { useActions, useCommandGroup } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import { launchCli, useQuitCommand } from "@tooee/shell";

function WhichKeyE2EApp() {
  const [lastAction, setLastAction] = useState("none");

  useQuitCommand();

  useCommandGroup({ id: "stream", prefix: "space s", title: "Stream" });
  useCommandGroup({ id: "artifact", prefix: "space a", title: "Artifact" });

  const actions = useMemo<ActionDefinition[]>(
    () => [
      {
        category: "Stream",
        group: "Stream",
        handler: () => setLastAction("opened today stream"),
        hotkey: "space s t",
        id: "e2e.stream.open-today",
        title: "Open today stream",
      },
      {
        category: "Stream",
        group: "Stream",
        handler: () => setLastAction("dispatched task"),
        hotkey: "space s d",
        id: "e2e.stream.dispatch",
        title: "Dispatch task",
      },
      {
        category: "Artifact",
        group: "Artifact",
        handler: () => setLastAction("opened artifact"),
        hotkey: "space a o",
        id: "e2e.artifact.open",
        title: "Open artifact",
      },
      {
        category: "General",
        group: "General",
        handler: () => setLastAction("refreshed"),
        hotkey: "space r",
        id: "e2e.refresh",
        title: "Refresh",
      },
      {
        handler: () => setLastAction("hidden maintenance"),
        hidden: true,
        hotkey: "space x",
        id: "e2e.hidden",
        title: "Hidden maintenance action",
      },
      {
        category: "Navigation",
        handler: () => setLastAction("local go"),
        hotkey: "g g",
        id: "e2e.local-go",
        title: "Local go command",
      },
    ],
    [],
  );

  useActions(actions);

  return (
    <AppLayout statusBar={{ items: [{ label: "Mode:", value: "cursor" }] }}>
      <box flexDirection="column" paddingLeft={2} paddingTop={1}>
        <text content="which-key e2e ready" />
        <text content={`last:${lastAction}`} />
      </box>
    </AppLayout>
  );
}

await launchCli(<WhichKeyE2EApp />, { leader: "space" });
