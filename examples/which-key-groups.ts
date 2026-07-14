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

import { createElement, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useActions, useCommandGroup } from "@tooee/commands";
import type { ActionDefinition } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import { launchCli, useQuitCommand } from "@tooee/shell";
import { useTheme } from "@tooee/themes";

const h = function h<Props extends object>(
  tag: string | ComponentType<Props>,
  props: Props,
  ...children: ReactNode[]
): ReactNode {
  return createElement(tag, props, ...children);
};

const WhichKeyGroupsDemo = function WhichKeyGroupsDemo(): ReactNode {
  const { theme } = useTheme();
  const [lastAction, setLastAction] = useState("Press space to open the which-key overlay");

  useQuitCommand();

  useCommandGroup({
    description: "Open, create, and dispatch stream work",
    icon: "S",
    id: "stream",
    prefix: "space s",
    title: "Stream",
  });
  useCommandGroup({
    description: "Open and edit stream artifacts",
    icon: "A",
    id: "artifact",
    prefix: "space a",
    title: "Artifact",
  });
  useCommandGroup({
    description: "Capture notes and tasks",
    icon: "C",
    id: "capture",
    prefix: "space c",
    title: "Capture",
  });
  useCommandGroup({
    description: "Navigate to common views",
    icon: "G",
    id: "go",
    prefix: "space g",
    title: "Go",
  });

  const actions = useMemo<ActionDefinition[]>(
    () => [
      {
        category: "Stream",
        group: "Stream",
        handler: (ctx) => {
          setLastAction("Opened today's stream");
          ctx.toast.toast({ level: "success", message: "Opened today's stream" });
        },
        hotkey: "space s t",
        icon: "T",
        id: "demo.stream.open-today",
        title: "Open today stream",
      },
      {
        category: "Stream",
        group: "Stream",
        handler: (ctx) => {
          setLastAction("Created a new stream");
          ctx.toast.toast({ level: "success", message: "Created a new stream" });
        },
        hotkey: "space s n",
        icon: "N",
        id: "demo.stream.new",
        title: "New stream",
      },
      {
        category: "Stream",
        group: "Stream",
        handler: (ctx) => {
          setLastAction("Dispatched a task to the current stream");
          ctx.toast.toast({ level: "info", message: "Dispatched task" });
        },
        hotkey: "space s d",
        icon: "D",
        id: "demo.stream.dispatch",
        title: "Dispatch task",
      },
      {
        category: "Artifact",
        group: "Artifact",
        handler: (ctx) => {
          setLastAction("Opened the selected artifact");
          ctx.toast.toast({ level: "success", message: "Opened artifact" });
        },
        hotkey: "space a o",
        icon: "O",
        id: "demo.artifact.open",
        title: "Open artifact",
      },
      {
        category: "Artifact",
        group: "Artifact",
        handler: (ctx) => {
          setLastAction("Editing the selected artifact");
          ctx.toast.toast({ level: "info", message: "Editing artifact" });
        },
        hotkey: "space a e",
        icon: "E",
        id: "demo.artifact.edit",
        title: "Edit artifact",
      },
      {
        category: "Artifact",
        group: "Artifact",
        handler: (ctx) => {
          setLastAction("Revealed the artifact path");
          ctx.toast.toast({ level: "success", message: "Artifact path copied" });
        },
        hotkey: "space a p",
        icon: "P",
        id: "demo.artifact.reveal",
        title: "Reveal artifact path",
      },
      {
        category: "Capture",
        group: "Capture",
        handler: (ctx) => {
          setLastAction("Captured an idea");
          ctx.toast.toast({ level: "success", message: "Captured idea" });
        },
        hotkey: "space c i",
        icon: "I",
        id: "demo.capture.idea",
        title: "Capture idea",
      },
      {
        category: "Capture",
        group: "Capture",
        handler: (ctx) => {
          setLastAction("Captured a task");
          ctx.toast.toast({ level: "success", message: "Captured task" });
        },
        hotkey: "space c t",
        icon: "T",
        id: "demo.capture.task",
        title: "Capture task",
      },
      {
        category: "Navigation",
        group: "Go",
        handler: (ctx) => {
          setLastAction("Navigated to the dashboard");
          ctx.toast.toast({ level: "info", message: "Dashboard" });
        },
        hotkey: "space g d",
        icon: "D",
        id: "demo.go.dashboard",
        title: "Go to dashboard",
      },
      {
        category: "Navigation",
        group: "Go",
        handler: (ctx) => {
          setLastAction("Navigated to agents");
          ctx.toast.toast({ level: "info", message: "Agents" });
        },
        hotkey: "space g a",
        icon: "A",
        id: "demo.go.agents",
        title: "Go to agents",
      },
      {
        category: "General",
        group: "General",
        handler: (ctx) => {
          setLastAction("Refreshed the demo state");
          ctx.toast.toast({ level: "info", message: "Refreshed" });
        },
        hotkey: "space r",
        icon: "R",
        id: "demo.refresh",
        title: "Refresh",
      },
      {
        handler: () => {
          setLastAction("Ran hidden maintenance action");
        },
        hidden: true,
        hotkey: "space x",
        id: "demo.hidden-maintenance",
        title: "Hidden maintenance action",
      },
    ],
    [],
  );

  useActions(actions);

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
  ];

  const content = h(
    "box",
    { style: { flexDirection: "column", paddingLeft: 2, paddingTop: 1 } },
    h("text", { attributes: 1, content: "Which-key Groups Demo", fg: theme.primary }),
    h("text", { content: "" }),
    h("text", { content: `Last action: ${lastAction}`, fg: theme.accent }),
    h("text", { content: "" }),
    ...lines.map(
      (line, i): ReactNode =>
        h("text", {
          content: line,
          fg: line.startsWith("#") ? theme.primary : theme.text,
          key: i,
        }),
    ),
  );

  return h(
    AppLayout,
    {
      children: content,
      statusBar: { items: [{ label: "Mode:", value: "cursor" }] },
      titleBar: { title: "Which-key Groups Demo" },
    },
    content,
  );
};

await launchCli(createElement(WhichKeyGroupsDemo), { leader: "space" });
