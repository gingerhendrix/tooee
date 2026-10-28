---
packages:
  "@tooee/mermaid-pele": patch
---

## Draw Pele Mermaid diagrams at 1.5x by default

Pele Mermaid diagrams now draw at 1.5 screen pixels per SVG pixel, so 16 px labels show at 24 screen pixels. In 0.16.1 a diagram drew at one SVG pixel per screen pixel, and its labels were smaller than terminal text on a scaled display. The width and row caps still apply, so a diagram that already fills the pane or reaches the row cap draws at the same size as before.

The new `zoom` option of `createPeleMermaidRenderer` sets the factor. Pass `zoom: 1` to keep the 0.16.1 size. The `scale` option now defaults to the larger of 2 and `zoom`, so the raster is never enlarged on screen. `DEFAULT_MERMAID_ZOOM` is exported.
