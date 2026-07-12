#!/usr/bin/env bun
/**
 * view-mermaid.ts - Demonstrates mermaid diagram rendering in markdown
 *
 * This example shows:
 * - ```mermaid fences rendered as ASCII/ANSI diagrams (via beautiful-mermaid)
 * - Flowchart and sequence diagram support
 * - Wide diagrams clip instead of wrapping and pan horizontally
 *
 * Run: bun examples/view-mermaid.ts
 * Controls: j/k move cursor, h/l pan the wide diagram under the cursor,
 *           shift+wheel also pans, q quit, t/T cycle themes
 */

import { launch, type ContentProvider } from "@tooee/view";

const contentProvider: ContentProvider = {
  load: () => ({
    title: "Mermaid Diagrams",
    format: "markdown",
    markdown: `# Mermaid diagrams in Tooee

Fenced \`\`\`mermaid code blocks are rendered as terminal diagrams.
Invalid mermaid falls back to a plain code block.

## Flowchart

\`\`\`mermaid
graph TD
  Capture[Capture intent] --> Context[Read context]
  Context --> Execute[Execute task]
  Execute --> Artifact[Write artifact]
  Artifact --> Review{Review OK?}
  Review -- yes --> Done([Done])
  Review -- no --> Execute
\`\`\`

## Sequence diagram

\`\`\`mermaid
sequenceDiagram
  participant User
  participant Viewer
  participant Renderer

  User->>Viewer: Open markdown file
  Viewer->>Renderer: Render mermaid fence
  Renderer-->>Viewer: ASCII diagram
  Viewer-->>User: Draw styled blocks
\`\`\`

## Wide diagram (pans horizontally)

This diagram is wider than most terminals. It clips at the right edge
instead of wrapping. Move the cursor onto it with \`j\`, then pan with
\`h\` / \`l\` (or shift+mouse-wheel) to see the rest.

\`\`\`mermaid
flowchart LR
  AlphaStation[Alpha station] --> BetaStation[Beta station] --> GammaStation[Gamma station] --> DeltaStation[Delta station] --> EpsilonStation[Epsilon station] --> ZetaTerminal[Zeta terminal]
\`\`\`

## Fallback

Unsupported or invalid mermaid renders as a normal code block:

\`\`\`mermaid
this is not valid mermaid syntax {{{
\`\`\`

---

*Press \`q\` to quit this viewer.*
`,
  }),
};

launch({ contentProvider });
