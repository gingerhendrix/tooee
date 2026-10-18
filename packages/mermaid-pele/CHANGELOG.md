## @tooee/mermaid-pele@0.15.0

### Add `@tooee/mermaid-pele`, an opt-in Pele image renderer for Mermaid fences

The new package draws ` ```mermaid ` fences as images. It renders each diagram with Pele, applies the Tooee theme colours, and rasterizes it with resvg for the OpenTUI `<image>` element. Pele supports more diagram types than the ASCII renderer, for example pie, quadrant, timeline, and gantt charts.

Register it with `codeBlockRenderers: { mermaid: createPeleMermaidRenderer() }`. By default, a fence that Pele cannot draw, or a terminal with no pixel image support, falls back to the beautiful-mermaid ASCII renderer. The `strategy` option can put ASCII first or turn the ASCII step off.

The default Mermaid renderer in `MarkdownView` and `@tooee/view` does not change.
