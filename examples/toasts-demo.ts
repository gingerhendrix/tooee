#!/usr/bin/env bun
/**
 * toasts-demo.ts - Demonstrates the @tooee/toasts notification system
 *
 * This example shows:
 * - Triggering toasts at different levels (info, success, warning, error)
 * - Deduplication with toast IDs (same id updates in-place)
 * - Custom durations
 * - Using CommandContext.toast from action handlers
 *
 * Run: bun examples/toasts-demo.ts
 * Controls:
 *   1 — info toast
 *   2 — success toast
 *   3 — warning toast
 *   4 — error toast
 *   5 — dedup demo (rapid presses update counter)
 *   6 — custom 10s duration toast
 *   q — quit
 *   t — theme picker
 */

import { launch, type ContentProvider } from "@tooee/view"
import type { ActionDefinition } from "@tooee/commands"

const contentProvider: ContentProvider = {
  load: () => ({
    title: "Toast Demo",
    format: "code",
    language: "markdown",
    code: `# Toast Notification Demo

Press the following keys to trigger toasts:

  1  →  Info toast
  2  →  Success toast
  3  →  Warning toast
  4  →  Error toast
  5  →  Dedup demo (press rapidly — updates counter with same ID)
  6  →  Custom duration (10 seconds)

  q  →  Quit
  t  →  Theme picker
  y  →  Copy (demonstrates toast on copy)
`,
  }),
}

let dedupCounter = 0

const actions: ActionDefinition[] = [
  {
    id: "toast.info",
    title: "Info toast",
    hotkey: "1",
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({ message: "This is an info message", level: "info" })
    },
  },
  {
    id: "toast.success",
    title: "Success toast",
    hotkey: "2",
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({ message: "Operation completed successfully", level: "success" })
    },
  },
  {
    id: "toast.warning",
    title: "Warning toast",
    hotkey: "3",
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({ message: "Watch out! Something needs attention", level: "warning" })
    },
  },
  {
    id: "toast.error",
    title: "Error toast",
    hotkey: "4",
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({ message: "Something went wrong!", level: "error" })
    },
  },
  {
    id: "toast.dedup",
    title: "Dedup demo",
    hotkey: "5",
    modes: ["cursor"],
    handler: (ctx) => {
      dedupCounter++
      ctx.toast.toast({
        message: `Pressed ${dedupCounter} time${dedupCounter === 1 ? "" : "s"}`,
        level: "info",
        id: "dedup-counter",
      })
    },
  },
  {
    id: "toast.custom-duration",
    title: "Custom duration toast",
    hotkey: "6",
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({
        message: "This toast lasts 10 seconds",
        level: "info",
        duration: 10000,
      })
    },
  },
]

launch({ contentProvider, actions })
