---
packages:
  group:tooee:
    type: minor
---

## Remove the 0.8 compatibility APIs

Tooee 0.9 removes the compatibility forms deprecated in 0.8. `Choose` now
accepts only direct chooser props and `actions`; `launchCli` provider settings
must be nested under `provider`; and `AppLayout` scrolling must use `scroll`.

The config color type is now only `ColorMode`, command surfaces use
`useSurfaceInvoke`, and overlays use handles plus state hooks instead of
`show`, `hide`, and `isOpen`. The `tooee table` command has also been removed;
use `tooee view --renderer table`.

See [the 0.9 migration guide](../docs/migration-0.8-to-0.9.md) for replacements.
