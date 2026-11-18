## @tooee/mermaid-pele@0.17.0

### Draw SVG files and SVG images in Markdown

`tooee view diagram.svg` now draws the SVG as a terminal image, and so does a directory view. Markdown images such as `![Diagram](diagram.svg)`, `![[diagram.svg]]`, and `data:image/svg+xml` URIs draw as images too. `--renderer text` still shows the SVG source.

The new `@tooee/svg` package rasterizes SVG with resvg. Its `createSvgImageLoader()` returns an `ImageLoader`, a new hook in `@tooee/renderers` for image formats that OpenTUI cannot decode. Pass loaders as `imageLoaders` to `launch`, `launchDirectory`, `View`, `DirectoryView`, `MarkdownView`, or `createFileProvider`. An image from a loader draws at its intrinsic CSS size, not at the size of its raster. Libraries do not register the SVG loader by default, so apps without it still open `.svg` files as text and do not install resvg.

`@tooee/mermaid-pele` now rasterizes through `@tooee/svg`. It still exports `rasterizeSvg` and `findRasterFonts`.

## @tooee/mermaid-pele@0.16.4

### Require OpenTUI 0.8.3

All Tooee packages now require `@opentui/core` and `@opentui/react` `^0.8.3`. Update both dependencies together when upgrading Tooee. Row documents use the native ScrollBox geometry, and command and theme pickers keep their rows visible with OpenTUI's zero-size layout rule. Long Ask prompts keep an editor row visible.

`RowDocumentRenderable` inherits OpenTUI's ScrollBox facade parts: `content`, `viewport`, `wrapper`, and scrollbars are no longer renderables. Read their geometry properties (for example `content.height`) instead of `getLayout()`.

## @tooee/mermaid-pele@0.16.2

### Draw Pele Mermaid diagrams at 1.5x by default

Pele Mermaid diagrams now draw at 1.5 screen pixels per SVG pixel, so 16 px labels show at 24 screen pixels. In 0.16.1 a diagram drew at one SVG pixel per screen pixel, and its labels were smaller than terminal text on a scaled display. The width and row caps still apply, so a diagram that already fills the pane or reaches the row cap draws at the same size as before.

The new `zoom` option of `createPeleMermaidRenderer` sets the factor. Pass `zoom: 1` to keep the 0.16.1 size. The `scale` option now defaults to the larger of 2 and `zoom`, so the raster is never enlarged on screen. `DEFAULT_MERMAID_ZOOM` is exported.

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
