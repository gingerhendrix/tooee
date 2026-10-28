# @tooee/mermaid-pele

An opt-in renderer for ` ```mermaid ` Markdown fences. It draws each diagram with [Pele](https://github.com/obsidianmd/pele) as an SVG, applies the Tooee theme colours, rasterizes it with [resvg](https://github.com/thx/resvg-js), and shows the PNG in the OpenTUI `<image>` element.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

Tooee does not register this renderer by default. `MarkdownView` and `@tooee/view` keep the built-in beautiful-mermaid ASCII renderer. Apps that do not import this package do not install Pele or resvg.

## Use

```ts
import { createPeleMermaidRenderer } from "@tooee/mermaid-pele";
import { launch } from "@tooee/view";

await launch({
  codeBlockRenderers: { mermaid: createPeleMermaidRenderer() },
  contentProvider,
});
```

The same `codeBlockRenderers` map works on `View` and `MarkdownView`.

## Strategies

Each fence goes through a list of renderers. When one cannot draw the fence, the next one runs. The fence source is always the last step.

| `strategy`                  | Order                                       |
| --------------------------- | ------------------------------------------- |
| `pele-then-ascii` (default) | Pele image, beautiful-mermaid ASCII, source |
| `ascii-then-pele`           | beautiful-mermaid ASCII, Pele image, source |
| `pele-only`                 | Pele image, source                          |

The Pele step cannot draw a fence when Pele rejects the source, when resvg fails, or when the terminal has no pixel image support.

## Options

| Option | Default | Effect |
| --- | --- | --- |
| `strategy` | `pele-then-ascii` | Renderer order, see above. |
| `protocol` | `auto` | Image protocol for `<image>`. `auto` uses kitty or sixel when the terminal reports it. When `auto` resolves to `blocks` (no support, or inside tmux), the Pele step is skipped. Pass `blocks` to draw half-block images anyway. |
| `maxRows` | terminal height minus `IMAGE_WINDOW_PADDING_ROWS` (6) | Rows one diagram may use before it shrinks to fit. |
| `zoom` | `1.5` (`DEFAULT_MERMAID_ZOOM`) | Screen pixels per SVG pixel before the diagram shrinks to fit. Pele draws labels at 16 CSS px, so the default draws them at 24 screen px. Pass `1` for the 0.16.1 size. |
| `scale` | the larger of `2` and `zoom` | Raster pixel density over the SVG size. It changes sharpness, not the drawn size. |
| `cacheSize` | `64` | Diagrams kept in this renderer's cache. |
| `fonts` | detected | `{ files, sansFamily, monoFamily }` for resvg. |
| `now` | current time | Fixed clock for gantt "today" markers. |

Each `createPeleMermaidRenderer()` call has its own options and its own cache.

## Lower-level exports

- `renderPeleDiagram(source, options)` and `createPeleRenderCache(limit)`: the Pele, theme, and resvg pipeline. They return `{ ok: false, stage, code, message }` on failure and never throw.
- `peleVariablesFromTheme(theme, font, monoFont)` and `inlineCssVariables(svg, variables)`: map a Tooee theme to Pele's `--pele-*` tokens and inline every `var()` and `color-mix()`, because resvg does not support CSS custom properties.
- `imageBoxSize` and `cellGeometry`: size the image box in terminal cells from the SVG size and the cell pixel size.
- `supportsDiagramImages` and `useDiagramImageSupport`: the image support rule above.
- `findRasterFonts` and `rasterizeSvg`.

## Known limits

- **Images have no text features.** An image block has no copy, search, or horizontal pan. The ASCII renderer has all three.
- **First render cost.** Pele layout takes about 0.4 ms and the resvg raster about 18 ms for each diagram (warm median on the Personal vault corpus). The work is synchronous and cached, so a long document with many diagrams pauses once on first render.
- **Fonts.** Pele measures labels with Arial metrics. The renderer looks for Liberation Sans, then Arial, then DejaVu Sans. Other fonts can make labels overflow their boxes. When none of these fonts exists, resvg loads every system font, which is slower.
- **Pele is stricter than beautiful-mermaid.** Some fences that beautiful-mermaid draws, such as unquoted parentheses in an edge label, are Pele syntax errors. The default strategy draws those with ASCII.
- **Install weight.** Pele is about 3.5 MB. `@resvg/resvg-js` is about 8.5 MB plus a native binary for each platform.
