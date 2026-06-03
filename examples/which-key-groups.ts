#!/usr/bin/env bun
/**
 * which-key-groups.ts - Demonstrates leader-key which-key groups and actions
 *
 * This example shows:
 * - Registering named command groups with useCommandGroup()
 * - Configuring actions with group/category/icon metadata
 * - A leader-only which-key overlay that shows groups first, then actions
 *
 * Run: bun examples/which-key-groups.ts
 * Try:
 *   space        — show top-level leader groups/actions
 *   space s      — drill into Stream actions
 *   space a      — drill into Artifact actions
 *   space c      — drill into Capture actions
 *   space g      — drill into Go actions
 *   space r      — run Refresh directly
 *   q            — quit
 */

import { createElement, useMemo, useState, type ComponentType, type ReactNode } from "react"
import { useActions, useCommandGroup, type ActionDefinition } from "@tooee/commands"
import { AppLayout } from "@tooee/layout"
import { launchCli, useQuitCommand } from "@tooee/shell"
import { useTheme } from "@tooee/themes"

function h(
  tag: string | ComponentType<any>,
  props: Record<string, unknown>,
  ...children: ReactNode[]
): ReactNode {
  return createElement(tag, props, ...children)
}

function WhichKeyGroupsDemo(): ReactNode {
  const { theme } = useTheme()
  const [lastAction, setLastAction] = useState("Press space to open the which-key overlay")

  useQuitCommand()

  useCommandGroup({
    id: "stream",
    title: "Stream",
    prefix: "space s",
    description: "Open, create, and dispatch stream work",
    icon: "S",
  })
  useCommandGroup({
    id: "artifact",
    title: "Artifact",
    prefix: "space a",
    description: "Open and edit stream artifacts",
    icon: "A",
  })
  useCommandGroup({
    id: "capture",
    title: "Capture",
    prefix: "space c",
    description: "Capture notes and tasks",
    icon: "C",
  })
  useCommandGroup({
    id: "go",
    title: "Go",
    prefix: "space g",
    description: "Navigate to common views",
    icon: "G",
  })

  const actions = useMemo<ActionDefinition[]>(
    () => [
      {
        id: "demo.stream.open-today",
        title: "Open today stream",
        hotkey: "space s t",
        category: "Stream",
        group: "Stream",
        icon: "T",
        handler: (ctx) => {
          setLastAction("Opened today's stream")
          ctx.toast.toast({ message: "Opened today's stream", level: "success" })
        },
      },
      {
        id: "demo.stream.new",
        title: "New stream",
        hotkey: "space s n",
        category: "Stream",
        group: "Stream",
        icon: "N",
        handler: (ctx) => {
          setLastAction("Created a new stream")
          ctx.toast.toast({ message: "Created a new stream", level: "success" })
        },
      },
      {
        id: "demo.stream.dispatch",
        title: "Dispatch task",
        hotkey: "space s d",
        category: "Stream",
        group: "Stream",
        icon: "D",
        handler: (ctx) => {
          setLastAction("Dispatched a task to the current stream")
          ctx.toast.toast({ message: "Dispatched task", level: "info" })
        },
      },
      {
        id: "demo.artifact.open",
        title: "Open artifact",
        hotkey: "space a o",
        category: "Artifact",
        group: "Artifact",
        icon: "O",
        handler: (ctx) => {
          setLastAction("Opened the selected artifact")
          ctx.toast.toast({ message: "Opened artifact", level: "success" })
        },
      },
      {
        id: "demo.artifact.edit",
        title: "Edit artifact",
        hotkey: "space a e",
        category: "Artifact",
        group: "Artifact",
        icon: "E",
        handler: (ctx) => {
          setLastAction("Editing the selected artifact")
          ctx.toast.toast({ message: "Editing artifact", level: "info" })
        },
      },
      {
        id: "demo.artifact.reveal",
        title: "Reveal artifact path",
        hotkey: "space a p",
        category: "Artifact",
        group: "Artifact",
        icon: "P",
        handler: (ctx) => {
          setLastAction("Revealed the artifact path")
          ctx.toast.toast({ message: "Artifact path copied", level: "success" })
        },
      },
      {
        id: "demo.capture.idea",
        title: "Capture idea",
        hotkey: "space c i",
        category: "Capture",
        group: "Capture",
        icon: "I",
        handler: (ctx) => {
          setLastAction("Captured an idea")
          ctx.toast.toast({ message: "Captured idea", level: "success" })
        },
      },
      {
        id: "demo.capture.task",
        title: "Capture task",
        hotkey: "space c t",
        category: "Capture",
        group: "Capture",
        icon: "T",
        handler: (ctx) => {
          setLastAction("Captured a task")
          ctx.toast.toast({ message: "Captured task", level: "success" })
        },
      },
      {
        id: "demo.go.dashboard",
        title: "Go to dashboard",
        hotkey: "space g d",
        category: "Navigation",
        group: "Go",
        icon: "D",
        handler: (ctx) => {
          setLastAction("Navigated to the dashboard")
          ctx.toast.toast({ message: "Dashboard", level: "info" })
        },
      },
      {
        id: "demo.go.agents",
        title: "Go to agents",
        hotkey: "space g a",
        category: "Navigation",
        group: "Go",
        icon: "A",
        handler: (ctx) => {
          setLastAction("Navigated to agents")
          ctx.toast.toast({ message: "Agents", level: "info" })
        },
      },
      {
        id: "demo.refresh",
        title: "Refresh",
        hotkey: "space r",
        category: "General",
        group: "General",
        icon: "R",
        handler: (ctx) => {
          setLastAction("Refreshed the demo state")
          ctx.toast.toast({ message: "Refreshed", level: "info" })
        },
      },
      {
        id: "demo.hidden-maintenance",
        title: "Hidden maintenance action",
        hotkey: "space x",
        hidden: true,
        handler: () => {
          setLastAction("Ran hidden maintenance action")
        },
      },
    ],
    [],
  )

  useActions(actions)

  const lines = [
    "# Which-key groups demo",
    "",
    "Press space to show the leader overlay. Named groups should appear as:",
    "",
    "  s  Stream",
    "  a  Artifact",
    "  c  Capture",
    "  g  Go",
    "  r  Refresh",
    "",
    "Press a group key to update the overlay with that group's actions:",
    "",
    "  space s  → t Open today stream, n New stream, d Dispatch task",
    "  space a  → o Open artifact, e Edit artifact, p Reveal artifact path",
    "  space c  → i Capture idea, t Capture task",
    "  space g  → d Go to dashboard, a Go to agents",
    "",
    "The hidden space x action is registered but should not appear in which-key.",
    "Press q to quit.",
  ]

  const content = h(
    "box",
    { style: { flexDirection: "column", paddingLeft: 2, paddingTop: 1 } },
    h("text", { content: "Which-key Groups Demo", fg: theme.primary, attributes: 1 }),
    h("text", { content: "" }),
    h("text", { content: `Last action: ${lastAction}`, fg: theme.accent }),
    h("text", { content: "" }),
    ...lines.map((line, i) =>
      h("text", {
        key: i,
        content: line,
        fg: line.startsWith("#") ? theme.primary : theme.text,
      }),
    ),
  )

  return h(
    AppLayout,
    {
      titleBar: { title: "Which-key Groups Demo" },
      statusBar: { items: [{ label: "Mode:", value: "cursor" }] },
    },
    content,
  )
}

await launchCli(createElement(WhichKeyGroupsDemo), { leader: "space" })
