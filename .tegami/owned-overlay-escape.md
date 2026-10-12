---
packages:
  "@tooee/shell": patch
  "@tooee/overlays": patch
---

## Escape closes an `ownCommands` modal

An overlay opened with `ownCommands: true` and the default `dismissOnEscape` now closes on Escape, with the close reason `"escape"`. Before, the modal surface suspended root dispatch, so the root Escape command never ran, and `dismissOnEscape` had no effect. An Escape command that the overlay registers itself still runs first.
