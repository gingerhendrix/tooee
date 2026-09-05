---
packages:
  "@tooee/shell": patch
---

## Schedule removal of top-level launch provider options

The top-level `leader`, `config`, `initialMode`, and `sequenceTimeoutMs` options on `launchCli` are deprecated. Move these values into `provider` before the aliases are removed in 0.9.0.
