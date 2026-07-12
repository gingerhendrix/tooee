#!/usr/bin/env bun
/**
 * mouse-demo.ts - Demonstrates Tooee's mouse support in a table View
 *
 * This example shows all three mouse features added to Tooee:
 *
 *   1. Left-click a row     -> selects it (moves the cursor to that row)
 *   2. Right-click a row    -> opens a context menu of the row's actions
 *   3. Clickable overlays    -> open the command palette (:) or theme
 *                               picker (t); click an item to run/apply it,
 *                               or click the "✕" to dismiss
 *
 * Mouse support is additive: every keyboard/vim flow still works unchanged.
 * The context-menu entries come from the `actions` passed to `launch()` —
 * the same actions are available via the command palette and their hotkeys.
 *
 * Run: bun examples/mouse-demo.ts
 *
 * Controls:
 *   Mouse:
 *     left-click row   select the row
 *     right-click row  open the row context menu (then click / j,k + Enter)
 *     click item       run/apply an item in an open palette or picker
 *     click "✕"        close an open overlay
 *   Keyboard:
 *     j / k            move cursor down / up
 *     o                open the active row (toast)
 *     y                copy the active row's name (toast)
 *     x                mark the active row done (toast)
 *     :                command palette  (has a clickable ✕)
 *     t                theme picker     (has a clickable ✕)
 *     q                quit
 */

import { launch } from "@tooee/view";
import type { ContentProvider, Content } from "@tooee/view";
import type { ActionDefinition, CommandContext } from "@tooee/commands";

interface FileRow {
  name: string;
  kind: string;
  size: string;
  modified: string;
}

const files: FileRow[] = [
  { kind: "doc", modified: "2 hours ago", name: "README.md", size: "2.1 KB" },
  { kind: "config", modified: "yesterday", name: "package.json", size: "1.9 KB" },
  { kind: "source", modified: "10 min ago", name: "src/index.ts", size: "812 B" },
  { kind: "source", modified: "10 min ago", name: "src/launch.tsx", size: "1.2 KB" },
  { kind: "source", modified: "1 hour ago", name: "src/view.tsx", size: "4.4 KB" },
  { kind: "config", modified: "3 days ago", name: "tsconfig.json", size: "740 B" },
  { kind: "lock", modified: "1 hour ago", name: "bun.lock", size: "38 KB" },
  { kind: "doc", modified: "yesterday", name: "docs/testing.md", size: "6.7 KB" },
  { kind: "source", modified: "just now", name: "examples/mouse-demo.ts", size: "3.0 KB" },
  { kind: "doc", modified: "30 days ago", name: "LICENSE", size: "1.0 KB" },
];

const columns = [
  { header: "Name", key: "name" },
  { header: "Kind", key: "kind" },
  { header: "Size", key: "size" },
  { header: "Modified", key: "modified" },
];

const contentProvider: ContentProvider = {
  load: (): Content => ({
    columns,
    format: "table",
    rows: files as unknown as Record<string, string>[],
    title: "Mouse Demo — left-click to select, right-click for actions",
  }),
};

/** Name of the row currently under the cursor, or a fallback. */
const activeName = function activeName(ctx: CommandContext): string {
  const row = ctx.document?.activeRow as Record<string, unknown> | undefined;
  const name = row?.name;
  return typeof name === "string" ? name : "(no row)";
};

// These actions populate the right-click context menu. They are also reachable
// from the command palette (:) and via their hotkeys.
const actions: ActionDefinition[] = [
  {
    handler: (ctx) => {
      ctx.toast.toast({ level: "info", message: `Open ${activeName(ctx)}` });
    },
    hotkey: "o",
    icon: "\u{1F4C2}",
    id: "row.open",
    modes: ["cursor"],
    title: "Open",
  },
  {
    handler: (ctx) => {
      ctx.toast.toast({ level: "success", message: `Copied "${activeName(ctx)}"` });
    },
    hotkey: "y",
    icon: "\u{1F4CB}",
    id: "row.copy-name",
    modes: ["cursor"],
    title: "Copy name",
  },
  {
    handler: (ctx) => {
      ctx.toast.toast({ level: "success", message: `Marked ${activeName(ctx)} done` });
    },
    hotkey: "x",
    icon: "\u{2713}",
    id: "row.mark-done",
    modes: ["cursor"],
    title: "Mark done",
  },
  {
    handler: (ctx) => {
      ctx.toast.toast({ level: "warning", message: `Delete ${activeName(ctx)} (demo only)` });
    },
    icon: "\u{1F5D1}",
    id: "row.delete",
    modes: ["cursor"],
    title: "Delete",
  },
];

launch({ actions, contentProvider });
