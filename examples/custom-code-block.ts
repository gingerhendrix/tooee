#!/usr/bin/env bun
/**
 * custom-code-block.ts - Demonstrates custom code block renderers in markdown
 *
 * This example shows:
 * - Registering a CodeBlockRenderer for a fence type ("chart") so that
 *   ```chart blocks render a bar chart instead of a syntax-highlighted
 *   code block
 * - Using CodeBlockChrome for the standard bordered-box styling
 * - Fence types are matched on the first word of the info string,
 *   case-insensitively; unmatched types (like the ```json block below)
 *   fall back to the default code block
 * - Built-in mermaid rendering still works via the same registry
 *
 * Run: bun examples/custom-code-block.ts
 * Controls: j/k scroll, c enter cursor mode, q quit, t theme picker
 */

import { createElement } from "react";
import { launch, CodeBlockChrome } from "@tooee/view";
import type { ContentProvider, CodeBlockRendererProps } from "@tooee/view";
import type { ReactNode } from "react";

// === Markdown content with a custom fence type ===

const markdown = `# Custom Code Block Renderers

The \`chart\` fence below is rendered by a custom renderer registered via
\`launch({ codeBlockRenderers })\`:

\`\`\`chart
Deploys,12
Rollbacks,2
Incidents,1
Hotfixes,4
\`\`\`

Fence matching only uses the first word of the info string, so options are
allowed (and the match is case-insensitive):

\`\`\`Chart title=Weekly
Reviews,9
Merges,14
\`\`\`

Unregistered fence types fall back to the default code block:

\`\`\`json
{ "renderer": "default", "highlighted": true }
\`\`\`

Built-in mermaid rendering still works via the same registry:

\`\`\`mermaid
graph LR
  A[Markdown] --> B[Registry] --> C[Custom Block]
\`\`\`
`;

// === Custom renderer ===

const BAR_WIDTH = 30;

function h(tag: string, props: Record<string, unknown>, ...children: ReactNode[]): ReactNode {
  return createElement(tag, props, ...children);
}

/**
 * Renders "label,value" lines as a horizontal bar chart. Returns null on
 * unparseable input, which falls back to the default code block.
 */
function ChartRenderer({ text, theme, indent }: CodeBlockRendererProps): ReactNode {
  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [label, raw] = line.split(",");
      return { label: (label ?? "").trim(), value: Number((raw ?? "").trim()) };
    });

  if (rows.length === 0 || rows.some((row) => row.label === "" || !Number.isFinite(row.value))) {
    return null; // fall back to the default code block
  }

  const max = Math.max(...rows.map((row) => row.value));
  const labelWidth = Math.max(...rows.map((row) => row.label.length));

  return createElement(
    CodeBlockChrome,
    { indent, theme },
    ...rows.map((row, i) => {
      const barLength = max > 0 ? Math.max(1, Math.round((row.value / max) * BAR_WIDTH)) : 0;
      const label = row.label.padEnd(labelWidth);
      return h(
        "text",
        { key: i, style: { height: 1 } },
        h("span", { fg: theme.textMuted }, `${label} `),
        h("span", { fg: theme.accent }, "█".repeat(barLength)),
        h("span", { fg: theme.text }, ` ${row.value}`),
      );
    }),
  );
}

// === Content provider ===

const contentProvider: ContentProvider = {
  load: () => ({
    format: "markdown" as const,
    markdown,
    title: "Custom Code Blocks",
  }),
};

// === Launch ===

launch({
  codeBlockRenderers: {
    chart: ChartRenderer,
  },
  contentProvider,
});
