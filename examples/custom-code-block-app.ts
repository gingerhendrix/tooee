#!/usr/bin/env bun
/**
 * custom-code-block-app.ts - Release dashboard built from custom code blocks
 *
 * An app-style demo of the codeBlockRenderers API: a markdown "release
 * dashboard" where each fence type renders a purpose-built block instead of
 * a syntax-highlighted code block.
 *
 * This example shows:
 * - Registering multiple CodeBlockRenderers ("progress", "callout",
 *   "timeline") via launch({ codeBlockRenderers })
 * - Using CodeBlockChrome for the standard bordered-box look, and drawing
 *   fully custom chrome (the callout boxes)
 * - Reading renderer options from the fence info string (```callout warning)
 * - Opting into horizontal panning for wide content via the hScroll prop:
 *   the deploy timeline is ~140 columns wide — pan it with h/l in cursor
 *   mode or shift+wheel, exactly like built-in code and mermaid blocks
 * - Fallback behavior: unregistered fences (the json block) render the
 *   default code block, and renderers return null on unparseable input
 * - Built-in mermaid rendering via the same registry
 *
 * Run: bun examples/custom-code-block-app.ts
 * Controls: j/k scroll, c cursor mode, h/l pan wide blocks, q quit, t themes
 */

import { createElement } from "react";
import { launch, CodeBlockChrome } from "@tooee/view";
import type { ContentProvider, CodeBlockRendererProps } from "@tooee/view";
import type { ReactNode } from "react";

type Theme = CodeBlockRendererProps["theme"];

function h(tag: string, props: Record<string, unknown>, ...children: ReactNode[]): ReactNode {
  return createElement(tag, props, ...children);
}

// === Markdown content ===

const markdown = `# Release 24.7 Dashboard

Rollout status for release 24.7. Every block below is a markdown code fence
rendered by a custom renderer registered via \`codeBlockRenderers\`.

## Rollout progress

\`\`\`progress
api,100
web,85
worker,60
mobile,25
\`\`\`

## Alerts

\`\`\`callout warning
Rollback window closes at 18:00 UTC.
Keep an eye on error budgets until then.
\`\`\`

\`\`\`callout success
Database migration completed with zero downtime.
\`\`\`

## Canary config

Unregistered fence types still render as normal code blocks:

\`\`\`json
{ "canary": true, "trafficPercent": 5, "regions": ["eu-west", "us-east"] }
\`\`\`

## Rollout map

Built-in mermaid rendering works via the same registry:

\`\`\`mermaid
graph LR
  Build --> Canary --> Fleet
\`\`\`

## Deploy timeline

The timeline is wider than the terminal. Enter cursor mode (\`c\`), move to
the block, and pan with \`h\`/\`l\` — or shift+wheel over it.

\`\`\`timeline
checkout,0,3
payments,2,6
search,6,4
recommendations,9,8
notifications,16,5
edge-cache,20,4
\`\`\`
`;

// === progress: "label,percent" lines as progress bars ===

const PROGRESS_BAR_WIDTH = 24;

function ProgressRenderer({ text, theme, indent }: CodeBlockRendererProps): ReactNode {
  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [label, raw] = line.split(",");
      return { label: (label ?? "").trim(), value: Number((raw ?? "").trim()) };
    });

  const invalid = rows.some(
    (row) => row.label === "" || !Number.isFinite(row.value) || row.value < 0 || row.value > 100,
  );
  if (rows.length === 0 || invalid) return null; // fall back to the default code block

  const labelWidth = Math.max(...rows.map((row) => row.label.length));

  return createElement(
    CodeBlockChrome,
    { indent, theme },
    ...rows.map((row, i) => {
      const filled = Math.round((row.value / 100) * PROGRESS_BAR_WIDTH);
      return h(
        "text",
        { key: i, style: { height: 1 } },
        h("span", { fg: theme.textMuted }, `${row.label.padEnd(labelWidth)} `),
        h("span", { fg: row.value >= 100 ? theme.success : theme.accent }, "█".repeat(filled)),
        h("span", { fg: theme.borderSubtle }, "░".repeat(PROGRESS_BAR_WIDTH - filled)),
        h("span", { fg: theme.text }, ` ${String(row.value).padStart(3)}%`),
      );
    }),
  );
}

// === callout: admonition box; kind comes from the fence info string ===

const CALLOUT_STYLES: Record<string, { label: string; color: (theme: Theme) => string }> = {
  error: { color: (theme) => theme.error, label: "ERROR" },
  info: { color: (theme) => theme.info, label: "INFO" },
  success: { color: (theme) => theme.success, label: "SUCCESS" },
  warn: { color: (theme) => theme.warning, label: "WARNING" },
  warning: { color: (theme) => theme.warning, label: "WARNING" },
};

function CalloutRenderer({ text, info, theme, indent }: CodeBlockRendererProps): ReactNode {
  // ```callout warning — the kind is the second word of the info string
  const kind = info.trim().split(/\s+/u)[1]?.toLowerCase() ?? "info";
  const style = CALLOUT_STYLES[kind];
  if (!style || text.trim() === "") return null; // fall back to the default code block

  const color = style.color(theme);
  const lines = text.trimEnd().split("\n");

  // Callouts draw their own chrome instead of using CodeBlockChrome
  return h(
    "box",
    {
      style: {
        backgroundColor: theme.backgroundElement,
        border: true,
        borderColor: color,
        flexDirection: "column",
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
        paddingLeft: 1,
        paddingRight: 1,
      },
    },
    h("text", { style: { height: 1 } }, h("span", { fg: color }, `● ${style.label}`)),
    ...lines.map((line, i) =>
      h("text", { content: line, key: i, style: { fg: theme.text, height: 1 } }),
    ),
  );
}

// === timeline: "label,startHour,durationHours" as a wide deploy timeline ===
//
// The rendered block is ~140 columns wide, so it demonstrates the hScroll
// opt-in: attach hScroll.register as the ref and hScroll.onMouseScroll as
// the scroll handler on a wrapMode="none" text renderable, and the block
// pans exactly like built-in code and mermaid blocks.

const TIMELINE_HOURS = 24;
const TIMELINE_HOUR_COLS = 5;

function TimelineRenderer({ text, theme, indent, hScroll }: CodeBlockRendererProps): ReactNode {
  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [label, start, duration] = line.split(",");
      return {
        duration: Number((duration ?? "").trim()),
        label: (label ?? "").trim(),
        start: Number((start ?? "").trim()),
      };
    });

  const invalid = rows.some(
    (row) =>
      row.label === "" ||
      !Number.isFinite(row.start) ||
      !Number.isFinite(row.duration) ||
      row.start < 0 ||
      row.duration <= 0 ||
      row.start + row.duration > TIMELINE_HOURS,
  );
  if (rows.length === 0 || invalid) return null; // fall back to the default code block

  const labelWidth = Math.max(...rows.map((row) => row.label.length));
  const axisWidth = TIMELINE_HOURS * TIMELINE_HOUR_COLS;
  const gutter = " ".repeat(labelWidth + 1);

  let ticks = "";
  for (let hour = 0; hour < TIMELINE_HOURS; hour += 4) {
    ticks += `${hour}:00`.padEnd(4 * TIMELINE_HOUR_COLS);
  }

  const lines: string[] = [
    `${gutter + ticks}24:00`,
    gutter + "┄".repeat(axisWidth),
    ...rows.map((row) => {
      const offset = " ".repeat(Math.round(row.start * TIMELINE_HOUR_COLS));
      const bar = "█".repeat(Math.max(1, Math.round(row.duration * TIMELINE_HOUR_COLS)));
      return `${row.label.padEnd(labelWidth)} ${offset}${bar}`;
    }),
  ];

  return createElement(
    CodeBlockChrome,
    { indent, theme },
    h("text", {
      content: lines.join("\n"),
      onMouseScroll: hScroll.onMouseScroll,
      ref: hScroll.register,
      style: { fg: theme.markdownText, height: lines.length },
      wrapMode: "none",
    }),
  );
}

// === Content provider ===

const contentProvider: ContentProvider = {
  load: () => ({
    format: "markdown" as const,
    markdown,
    title: "Release Dashboard",
  }),
};

// === Launch ===

launch({
  codeBlockRenderers: {
    callout: CalloutRenderer,
    progress: ProgressRenderer,
    timeline: TimelineRenderer,
  },
  contentProvider,
});
