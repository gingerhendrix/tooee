---
packages:
  "@tooee/themes": patch
---

## Keep selected and highlighted rows visible in every theme

`resolveTheme()` now keeps `backgroundPanel` and `selection` at least 0.05 ΔEOK from `background`, `cursorLine` at least 0.05 from `background`, and `backgroundElement` at least 0.05 from `backgroundPanel`. It moves only Oklab lightness, so each theme keeps its hue. The floor also applies to user and project themes, and it overrides explicit values that sit closer than 0.05. `MIN_SURFACE_SEPARATION` is exported.

A theme without a `selection` colour now gets `primary` at 20% over `background`. Before, `selection` copied `backgroundPanel`, so a selected row looked the same as a panel.

`lucent-orng` keeps its transparent page, but `backgroundPanel` and `backgroundElement` are now opaque colours from `orng`. Overlays cover the content behind them, and the title bar, status bar and gutter draw as opaque strips.
