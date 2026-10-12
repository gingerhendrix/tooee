---
packages:
  "@tooee/commands": patch
---

## `ctx.exit()` closes the app everywhere

`ctx.exit()` did nothing in a `launchCli` app or in View, because only Ask and Choose supplied an `exit`. The command provider now uses the renderer's `destroy` as the default `exit`. A context source can still supply its own `exit`.
