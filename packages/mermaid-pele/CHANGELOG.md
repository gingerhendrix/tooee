## @tooee/mermaid-pele@0.16.1

### Size terminal images from their pixel dimensions

Markdown images, image files in View, and Pele Mermaid diagrams now draw at their own pixel size, one image pixel per screen pixel. An image shrinks, keeping its aspect ratio, only when it is wider than the space it has or taller than the terminal less 6 rows. Tooee never enlarges an image.

A Markdown image without a size no longer reserves a fixed 12-row box. It takes no rows until its pixel size is known. An Obsidian `|width` embed now derives its rows from the aspect ratio. A `|widthxheight` embed keeps its box. In View, a `fit` image is centred with one cell of padding.

`@tooee/renderers` exports `naturalImageBox`, `cellGeometry`, `DEFAULT_CELL_GEOMETRY` and `IMAGE_WINDOW_PADDING_ROWS`. `@tooee/mermaid-pele` re-exports the cell geometry helpers from there, and its `maxRows` option now defaults to the terminal height less 6 rows in place of 40.

## @tooee/mermaid-pele@0.16.0

### Move to OpenTUI 0.6.6

Tooee now requires OpenTUI core and React `^0.6.6` and Bun 1.3.14 or newer. Gutters, initial scroll follow and Ask scrollbars are ready on the first frame. Ask cursor placement, line opening and line copy use native editor offsets for wide characters, emoji, tabs and control notation. CLI result promises wait for terminal restoration before returning.

`@tooee/themes` no longer exposes `Theme.syntax`. Use `useTheme().syntax` inside a theme provider, or call `buildSyntaxStyle(theme.colors, renderer.nativeScene)` for imperative rendering. Syntax styles belong to one renderer and must not be shared across renderers.

`hunkdiff` stays pinned at 0.22.0. Its two OpenTUI peer warnings on fresh installs are safe to ignore while its declared peer ranges catch up.

## @tooee/mermaid-pele@0.15.0

### Add `@tooee/mermaid-pele`, an opt-in Pele image renderer for Mermaid fences

The new package draws ` ```mermaid ` fences as images. It renders each diagram with Pele, applies the Tooee theme colours, and rasterizes it with resvg for the OpenTUI `<image>` element. Pele supports more diagram types than the ASCII renderer, for example pie, quadrant, timeline, and gantt charts.

Register it with `codeBlockRenderers: { mermaid: createPeleMermaidRenderer() }`. By default, a fence that Pele cannot draw, or a terminal with no pixel image support, falls back to the beautiful-mermaid ASCII renderer. The `strategy` option can put ASCII first or turn the ASCII step off.

The default Mermaid renderer in `MarkdownView` and `@tooee/view` does not change.
