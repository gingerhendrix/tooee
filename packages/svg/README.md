# @tooee/svg

An opt-in SVG image loader for Tooee. OpenTUI's `<image>` element decodes PNG, JPEG, WebP, and GIF, but not SVG. This package rasterizes SVG to PNG with [resvg](https://github.com/thx/resvg-js) so Tooee views can draw SVG files and SVG images in Markdown.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

Tooee does not register this loader by default. Apps that do not import this package do not install resvg, and they open `.svg` files as text.

## Use

```ts
import { createSvgImageLoader } from "@tooee/svg";
import { createFileProvider, launch } from "@tooee/view";

const imageLoaders = [createSvgImageLoader()];

await launch({
  contentProvider: createFileProvider("diagram.svg", { imageLoaders }),
  filePath: "diagram.svg",
  imageLoaders,
});
```

`createFileProvider` opens a file that a loader matches as an image. `launch`, `launchDirectory`, `View`, `DirectoryView`, and `MarkdownView` take the same `imageLoaders` and use them for image files and for Markdown images.

The loader matches:

- paths that end in `.svg`, in any case;
- `file:`, `http:`, and `https:` URLs whose path ends in `.svg`;
- `data:image/svg+xml` URIs, base64 or percent-encoded.

## Size

The loader returns the SVG's CSS size beside the PNG. Tooee sizes the image box from the CSS size, so an SVG of 120 x 60 CSS pixels draws at the same size as a PNG of 120 x 60 pixels. The PNG has `scale` times as many pixels in each direction, which only changes sharpness.

## Options

| Option | Default | Effect |
| --- | --- | --- |
| `scale` | `2` (`DEFAULT_SVG_SCALE`) | PNG pixels for each SVG CSS pixel. |
| `maxPixels` | `4096 * 4096` (`DEFAULT_SVG_MAX_PIXELS`) | Largest PNG pixel count. A larger SVG rasterizes at a lower scale. |
| `background` | none | Color painted under the SVG. |
| `fonts` | detected | `{ files, sansFamily, monoFamily }` for SVG text. |
| `fetch` | global `fetch` | Fetch for `http(s):` sources. |

## Lower-level exports

- `rasterizeSvg(svg, options)`: SVG text to PNG bytes, PNG size, and CSS size. `@tooee/mermaid-pele` uses it for diagrams.
- `findRasterFonts()`: picks Liberation Sans, then Arial, then DejaVu Sans, and the matching monospace font. Loading only these files is much faster than loading every system font.
- `limitRasterScale(width, height, scale, maxPixels)`: the scale cap above.
- `isSvgSource`, `readSvgSource`, and `decodeSvgDataUri`: the source rules above.

## Known limits

- **Transparency.** A transparent SVG stays transparent. Dark strokes can be hard to see on a dark theme. Pass `background` to paint under it.
- **Synchronous raster.** resvg parses and renders on the main thread. A large or complex SVG pauses the view while it loads.
- **No cache.** Each mount of an image reads and rasterizes the source again.
- **External references.** resvg does not load images that an SVG links with `<image href>`.
- **Install weight.** `@resvg/resvg-js` is about 8.5 MB plus a native binary for each platform.
