---
packages:
  "@tooee/shell": patch
---

## `Document` gutter uses the theme colours

The `Document` component in `@tooee/shell` did not give its row document a palette. Its gutter used fixed dark colours (`#0d1117` and `#6e7681`) in every theme. `Document` now uses `useGutterPalette()`, so the gutter takes `backgroundElement` and `textMuted` from the active theme, as `MarkdownView` and `CodeView` do. Pass `palette` to choose other colours.
