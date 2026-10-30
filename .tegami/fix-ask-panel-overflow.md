---
packages:
  "@tooee/layout": patch
  "@tooee/ask": patch
---

## Keep ask and choose overlay content inside the panel border

`OverlayPanel` resolves percentage insets to whole cells of its container. A panel with fractional geometry could put its hint bar on the bottom border, and the multiline ask editor and its scrollbar could draw on or past the border.

The multiline ask editor no longer takes its height from its content, so a title, prompt or margin above it keeps its row when the content is long. The editor scrollbar always reserves its column, so soft-wrapped text no longer runs under the scrollbar.
