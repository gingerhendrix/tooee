#!/usr/bin/env bun
/**
 * mouse-demo.ts - Demonstrates Tooee's mouse support in a table View
 *
 * This example shows all three mouse features added to Tooee:
 *
 *   1. Left-click a row     -> selects it (moves the cursor to that row)
 *   2. Right-click a row    -> opens a context menu of the row's actions
 *   3. Overlay close buttons -> open the command palette (:) or theme
 *                               picker (t) and click the "✕" to dismiss
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

import { launch, type ContentProvider, type Content } from "@tooee/view"
import type { ActionDefinition, CommandContext } from "@tooee/commands"

interface FileRow {
  name: string
  kind: string
  size: string
  modified: string
}

const files: FileRow[] = [
  { name: "README.md", kind: "doc", size: "2.1 KB", modified: "2 hours ago" },
  { name: "package.json", kind: "config", size: "1.9 KB", modified: "yesterday" },
  { name: "src/index.ts", kind: "source", size: "812 B", modified: "10 min ago" },
  { name: "src/launch.tsx", kind: "source", size: "1.2 KB", modified: "10 min ago" },
  { name: "src/View.tsx", kind: "source", size: "4.4 KB", modified: "1 hour ago" },
  { name: "tsconfig.json", kind: "config", size: "740 B", modified: "3 days ago" },
  { name: "bun.lock", kind: "lock", size: "38 KB", modified: "1 hour ago" },
  { name: "docs/testing.md", kind: "doc", size: "6.7 KB", modified: "yesterday" },
  { name: "examples/mouse-demo.ts", kind: "source", size: "3.0 KB", modified: "just now" },
  { name: "LICENSE", kind: "doc", size: "1.0 KB", modified: "30 days ago" },
]

const columns = [
  { key: "name", header: "Name" },
  { key: "kind", header: "Kind" },
  { key: "size", header: "Size" },
  { key: "modified", header: "Modified" },
]

const contentProvider: ContentProvider = {
  load: (): Content => ({
    title: "Mouse Demo — left-click to select, right-click for actions",
    format: "table",
    columns,
    rows: files as unknown as Record<string, string>[],
  }),
}

/** Name of the row currently under the cursor, or a fallback. */
function activeName(ctx: CommandContext): string {
  const row = ctx.view?.activeRow as Record<string, unknown> | undefined
  const name = row?.name
  return typeof name === "string" ? name : "(no row)"
}

// These actions populate the right-click context menu. They are also reachable
// from the command palette (:) and via their hotkeys.
const actions: ActionDefinition[] = [
  {
    id: "row.open",
    title: "Open",
    hotkey: "o",
    icon: "\u{1F4C2}", // open folder
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({ message: `Open ${activeName(ctx)}`, level: "info" })
    },
  },
  {
    id: "row.copy-name",
    title: "Copy name",
    hotkey: "y",
    icon: "\u{1F4CB}", // clipboard
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({ message: `Copied "${activeName(ctx)}"`, level: "success" })
    },
  },
  {
    id: "row.mark-done",
    title: "Mark done",
    hotkey: "x",
    icon: "\u{2713}", // check
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({ message: `Marked ${activeName(ctx)} done`, level: "success" })
    },
  },
  {
    id: "row.delete",
    title: "Delete",
    icon: "\u{1F5D1}", // wastebasket
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({ message: `Delete ${activeName(ctx)} (demo only)`, level: "warning" })
    },
  },
]

launch({ contentProvider, actions })
