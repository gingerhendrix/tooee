---
packages:
  "@tooee/layout": minor
  "@tooee/shell": minor
  "@tooee/view": patch
  "@tooee/ask": patch
  "@tooee/choose": patch
---

## Keep the status bar and title bar on one row

The status bar and the title bar no longer wrap onto a second row when the terminal is narrow. Before, a label could also lose its gap to its value.

`StatusBarItem` has new optional fields. `priority` sets which items stay longest. `align: "end"` puts an item at the right edge. `compact` gives a shorter form. `truncate` and `minValueWidth` let a value shorten with an ellipsis. When items do not fit, the bar uses compact forms first. Then it shortens or hides items, lowest priority first. A `⋯` glyph shows when items hide. Pass `hiddenMarker` to `StatusBar` or `AppLayout.statusBar` to change the glyph, or `false` to turn it off.

`StatusPriority` names the shared scale: `critical`, `position`, `focus`, `content`, `background` (the default), and `hint`. `fitStatusBar`, `fitTitleBar`, and `truncateCells` are exported for apps and tests.

`DocumentScreen` now shows `Mode:` and `Cursor:` at the right edge. `Cursor:` shortens to `Ln` when the bar is narrow. Built-in items in `@tooee/view`, `@tooee/ask`, and `@tooee/choose` have priorities, and their key hints go first.

The title bar shortens its subtitle first, hides it below 8 cells, and then shortens the title.

Items with only `label` and `value` look the same as before when they fit.
