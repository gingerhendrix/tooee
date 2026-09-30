---
packages:
  "@tooee/renderers": patch
---

## Fix Markdown bottom navigation around hidden HTML

Markdown HTML blocks, including implementation guide comments, no longer create invisible navigation rows. `G` reaches the final visible block and `j` stops there, with cursor highlights and source anchors aligned to the rendered blocks.
