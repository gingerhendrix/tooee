---
packages:
  "@tooee/renderers": patch
---

## Keep small cyclic Mermaid graphs responsive

Mermaid flowcharts with cyclic fan-in and fan-out topology now show their source instead of blocking the terminal UI during synchronous edge routing. Ordinary Mermaid diagrams continue to render as terminal diagrams.
