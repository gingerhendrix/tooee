#!/usr/bin/env bun
/**
 * view-pele-mermaid.ts - Draws mermaid fences as Pele images
 *
 * This example shows:
 * - The opt-in @tooee/mermaid-pele renderer, registered for ```mermaid fences
 * - Diagram types the ASCII renderer cannot draw, such as pie and quadrant charts
 * - The fallback to ASCII and then to source when Pele cannot draw a fence
 *
 * Run: bun examples/view/view-pele-mermaid.ts [file.md]
 *        [--strategy pele-then-ascii|ascii-then-pele|pele-only]
 *        [--protocol auto|kitty|sixel|blocks]
 * Controls: j/k scroll, t theme picker, q quit
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import type { ImageRenderProtocol } from "@opentui/core";
import { createPeleMermaidRenderer, PELE_MERMAID_STRATEGIES } from "@tooee/mermaid-pele";
import type { PeleMermaidStrategy } from "@tooee/mermaid-pele";
import { launch } from "@tooee/view";
import type { ContentProvider } from "@tooee/view";

const PROTOCOLS: readonly ImageRenderProtocol[] = ["auto", "kitty", "sixel", "blocks"];

const FENCE = "```";

const SAMPLE_MARKDOWN = `# Pele Mermaid diagrams

Mermaid fences are drawn by Pele as images. A fence that Pele cannot draw,
or a terminal with no image support, falls back to the ASCII renderer.

## Flowchart

${FENCE}mermaid
graph TD
  Capture[Capture intent] --> Context[Read context]
  Context --> Execute[Execute task]
  Execute --> Artifact[Write artifact]
  Artifact --> Review{Review OK?}
  Review -- yes --> Done([Done])
  Review -- no --> Execute
${FENCE}

## Pie chart (no ASCII support)

${FENCE}mermaid
pie title Fence types
  "flowchart" : 957
  "sequenceDiagram" : 101
  "other" : 53
${FENCE}

## Pele rejects this fence, so ASCII draws it

${FENCE}mermaid
flowchart LR
  Server -->|SSE (Shapes)| Client
${FENCE}

## Invalid source falls back to the code block

${FENCE}mermaid
this is not valid mermaid syntax {{{
${FENCE}
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    protocol: { default: "auto", type: "string" },
    strategy: { default: "pele-then-ascii", type: "string" },
  },
});

const isStrategy = (value: string): value is PeleMermaidStrategy =>
  PELE_MERMAID_STRATEGIES.some((strategy) => strategy === value);

const isProtocol = (value: string): value is ImageRenderProtocol =>
  PROTOCOLS.some((protocol) => protocol === value);

if (!isStrategy(values.strategy) || !isProtocol(values.protocol)) {
  throw new Error(
    `--strategy must be one of ${PELE_MERMAID_STRATEGIES.join(", ")}; --protocol one of ${PROTOCOLS.join(", ")}`
  );
}

const [filePath] = positionals;

const contentProvider: ContentProvider = {
  load: () => ({
    format: "markdown",
    markdown: filePath === undefined ? SAMPLE_MARKDOWN : readFileSync(filePath, "utf-8"),
    title: filePath === undefined ? "Pele Mermaid" : path.basename(filePath),
  }),
};

await launch({
  codeBlockRenderers: {
    mermaid: createPeleMermaidRenderer({ protocol: values.protocol, strategy: values.strategy }),
  },
  contentProvider,
  filePath,
});
