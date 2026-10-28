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
