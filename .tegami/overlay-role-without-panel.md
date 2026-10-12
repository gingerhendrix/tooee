---
packages:
  "@tooee/overlays": minor
---

## `OverlayRole` no longer accepts `"panel"`

An owned overlay opened with `role: "panel"` never became active, because a panel surface needs a panel group and overlays have none. `OverlayRole` is now `"modal" | "passive"`, so TypeScript rejects `"panel"`. Use `@tooee/panels` for panel surfaces.
