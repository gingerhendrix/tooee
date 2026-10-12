# @tooee/layout

Standard app chrome (title bar, status bar) for Tooee.

Layout is a composition package by design. It combines theme, command, overlay, search, and toast primitives into standard application chrome.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Overlays

Open overlays through the `@tooee/overlays` store (`useOverlay().open()` or `show()`). `AppLayout.overlay` remains available for 0.2.x source compatibility, but is deprecated and will be removed in 0.3.0. Store-backed overlays preserve stacking, command-surface ownership, and mode restoration.

## Status bar

`StatusBar` and `AppLayout.statusBar` take a list of items. The bar is always one row. When the items do not fit, the bar changes them in this order:

1. Items switch to their `compact` form, lowest priority first.
2. Lowest priority first, an item with `truncate` shortens its value down to `minValueWidth` cells (default 8). Then the item hides. On a tie, the item further right goes first.
3. The last item never hides. Its value shortens if it still does not fit.
4. Items that are still visible go back to their full form where there is room.

A `⋯` glyph shows after the start group when items hide. Set `hiddenMarker` to another glyph, or to `false`.

```tsx
import { AppLayout, StatusPriority } from "@tooee/layout";

<AppLayout
  statusBar={{
    items: [
      { label: "File:", value: path, priority: StatusPriority.focus, truncate: "start" },
      { label: "Lines:", value: String(lines), priority: StatusPriority.content },
      {
        label: "",
        value: "j/k move · : palette · q quit",
        priority: StatusPriority.hint,
        compact: { value: ": palette" },
      },
      { label: "Mode:", value: mode, priority: StatusPriority.position, align: "end" },
    ],
  }}
>
  {children}
</AppLayout>;
```

| Priority | Value | Use |
| --- | --- | --- |
| `StatusPriority.critical` | 4 | Must always show: a session phase, an error state |
| `StatusPriority.position` | 3 | Current mode and position |
| `StatusPriority.focus` | 2 | State the user acts on: a selection, a search query, the current file |
| `StatusPriority.content` | 1 | Content facts: format, line count |
| `StatusPriority.background` | 0 | The default. Background facts: the theme name |
| `StatusPriority.hint` | -1 | Key hints |

Use `truncate: "middle"` for ids such as model names, `"start"` for file paths, and `"end"` for free text. `fitStatusBar(items, width)` returns the same layout as the component, so tests can check it without a renderer.

The title bar follows the same one-row rule. It shortens the subtitle first, hides it below 8 cells, and then shortens the title.
