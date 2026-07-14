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

import { launch } from "@tooee/view";
import type { ContentProvider } from "@tooee/view";
import type { ActionDefinition } from "@tooee/commands";

const contentProvider: ContentProvider = {
  load: () => ({
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
    format: "code",
    language: "markdown",
    title: "Toast Demo",
  }),
};

let dedupCounter = 0;

const actions: ActionDefinition[] = [
  {
    handler: (ctx) => {
      ctx.toast.toast({ level: "info", message: "This is an info message" });
    },
    hotkey: "1",
    id: "toast.info",
    modes: ["cursor"],
    title: "Info toast",
  },
  {
    handler: (ctx) => {
      ctx.toast.toast({ level: "success", message: "Operation completed successfully" });
    },
    hotkey: "2",
    id: "toast.success",
    modes: ["cursor"],
    title: "Success toast",
  },
  {
    handler: (ctx) => {
      ctx.toast.toast({ level: "warning", message: "Watch out! Something needs attention" });
    },
    hotkey: "3",
    id: "toast.warning",
    modes: ["cursor"],
    title: "Warning toast",
  },
  {
    handler: (ctx) => {
      ctx.toast.toast({ level: "error", message: "Something went wrong!" });
    },
    hotkey: "4",
    id: "toast.error",
    modes: ["cursor"],
    title: "Error toast",
  },
  {
    handler: (ctx) => {
      dedupCounter += 1;
      ctx.toast.toast({
        id: "dedup-counter",
        level: "info",
        message: `Pressed ${dedupCounter} time${dedupCounter === 1 ? "" : "s"}`,
      });
    },
    hotkey: "5",
    id: "toast.dedup",
    modes: ["cursor"],
    title: "Dedup demo",
  },
  {
    handler: (ctx) => {
      ctx.toast.toast({
        duration: 10_000,
        level: "info",
        message: "This toast lasts 10 seconds",
      });
    },
    hotkey: "6",
    id: "toast.custom-duration",
    modes: ["cursor"],
    title: "Custom duration toast",
  },
];

await launch({ actions, contentProvider });
