#!/usr/bin/env bun

import { useMemo, useState } from "react"
import { useActions, useCommandGroup, type ActionDefinition } from "@tooee/commands"
import { AppLayout } from "@tooee/layout"
import { launchCli, useQuitCommand } from "@tooee/shell"

function WhichKeyE2EApp() {
  const [lastAction, setLastAction] = useState("none")

  useQuitCommand()

  useCommandGroup({ id: "stream", title: "Stream", prefix: "space s" })
  useCommandGroup({ id: "artifact", title: "Artifact", prefix: "space a" })

  const actions = useMemo<ActionDefinition[]>(
    () => [
      {
        id: "e2e.stream.open-today",
        title: "Open today stream",
        hotkey: "space s t",
        category: "Stream",
        group: "Stream",
        handler: () => setLastAction("opened today stream"),
      },
      {
        id: "e2e.stream.dispatch",
        title: "Dispatch task",
        hotkey: "space s d",
        category: "Stream",
        group: "Stream",
        handler: () => setLastAction("dispatched task"),
      },
      {
        id: "e2e.artifact.open",
        title: "Open artifact",
        hotkey: "space a o",
        category: "Artifact",
        group: "Artifact",
        handler: () => setLastAction("opened artifact"),
      },
      {
        id: "e2e.refresh",
        title: "Refresh",
        hotkey: "space r",
        category: "General",
        group: "General",
        handler: () => setLastAction("refreshed"),
      },
      {
        id: "e2e.hidden",
        title: "Hidden maintenance action",
        hotkey: "space x",
        hidden: true,
        handler: () => setLastAction("hidden maintenance"),
      },
      {
        id: "e2e.local-go",
        title: "Local go command",
        hotkey: "g g",
        category: "Navigation",
        handler: () => setLastAction("local go"),
      },
    ],
    [],
  )

  useActions(actions)

  return (
    <AppLayout statusBar={{ items: [{ label: "Mode:", value: "cursor" }] }}>
      <box flexDirection="column" paddingLeft={2} paddingTop={1}>
        <text content="which-key e2e ready" />
        <text content={`last:${lastAction}`} />
      </box>
    </AppLayout>
  )
}

await launchCli(<WhichKeyE2EApp />, { leader: "space" })
