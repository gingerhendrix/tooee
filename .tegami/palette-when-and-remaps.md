---
packages:
  "@tooee/commands": minor
  "@tooee/shell": patch
---

## The command palette hides unavailable commands and shows remapped keys

The palette now leaves out a command whose `when` returns false when the palette opens. Before, it listed the command, and choosing it did nothing.

The palette now shows the key from the `keys` config, not the command's default key. A root command that a panel command shadows under its remapped key loses its key hint, as dispatch does.

`useEffectiveCommands()` returns two new functions: `hotkeyFor(id)` gives the key that runs a command now, and `isAvailable(id)` checks the command's `when` against the context of the surface that owns it.
