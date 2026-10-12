---
packages:
  "@tooee/commands": patch
---

## A `+` hotkey works

A command bound to `"+"` now runs when you press `+`. Before, the parser split the step on `+` and the hotkey never matched. `"ctrl++"` binds `ctrl` with the `+` key, and `+` also works as one step in a sequence such as `"z +"`.
