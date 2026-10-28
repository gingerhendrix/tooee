---
packages:
  "@tooee/renderers": minor
  "@tooee/view": minor
  "@tooee/mermaid-pele": minor
---

## Size terminal images from their pixel dimensions

Markdown images, image files in View, and Pele Mermaid diagrams now draw at their own pixel size, one image pixel per screen pixel. An image shrinks, keeping its aspect ratio, only when it is wider than the space it has or taller than the terminal less 6 rows. Tooee never enlarges an image.

A Markdown image without a size no longer reserves a fixed 12-row box. It takes no rows until its pixel size is known. An Obsidian `|width` embed now derives its rows from the aspect ratio. A `|widthxheight` embed keeps its box. In View, a `fit` image is centred with one cell of padding.

`@tooee/renderers` exports `naturalImageBox`, `cellGeometry`, `DEFAULT_CELL_GEOMETRY` and `IMAGE_WINDOW_PADDING_ROWS`. `@tooee/mermaid-pele` re-exports the cell geometry helpers from there, and its `maxRows` option now defaults to the terminal height less 6 rows in place of 40.
