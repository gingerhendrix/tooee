# @tooee/layout

Standard app chrome (title bar, status bar) for Tooee.

Layout is a composition package by design. It combines theme, command,
overlay, search, and toast primitives into standard application chrome.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Overlays

Open overlays through the `@tooee/overlays` store (`useOverlay().open()` or
`show()`). `AppLayout.overlay` remains available for 0.2.x source compatibility,
but is deprecated and will be removed in 0.3.0. Store-backed overlays preserve
stacking, command-surface ownership, and mode restoration.
