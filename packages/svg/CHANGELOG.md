## @tooee/svg@0.17.0

### Draw SVG files and SVG images in Markdown

`tooee view diagram.svg` now draws the SVG as a terminal image, and so does a directory view. Markdown images such as `![Diagram](diagram.svg)`, `![[diagram.svg]]`, and `data:image/svg+xml` URIs draw as images too. `--renderer text` still shows the SVG source.

The new `@tooee/svg` package rasterizes SVG with resvg. Its `createSvgImageLoader()` returns an `ImageLoader`, a new hook in `@tooee/renderers` for image formats that OpenTUI cannot decode. Pass loaders as `imageLoaders` to `launch`, `launchDirectory`, `View`, `DirectoryView`, `MarkdownView`, or `createFileProvider`. An image from a loader draws at its intrinsic CSS size, not at the size of its raster. Libraries do not register the SVG loader by default, so apps without it still open `.svg` files as text and do not install resvg.

`@tooee/mermaid-pele` now rasterizes through `@tooee/svg`. It still exports `rasterizeSvg` and `findRasterFonts`.
