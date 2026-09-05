---
packages:
  "@tooee/layout": minor
  "@tooee/overlays": minor
---

## Share overlay panels and promise dialog lifecycles

`@tooee/layout` now exports `OverlayPanel`, shared panel inset types, and one `AppLayout.scroll` configuration object. The old `AppLayout` scroll props remain as deprecated aliases.

`@tooee/overlays` now exports `useOverlayDialog` for promise-based modal overlays. The unprovided `OverlayContext` and `OverlayContextValue` exports have been removed. Use the controller and state contexts or the overlay hooks instead.
