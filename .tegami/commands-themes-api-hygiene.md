---
packages:
  "@tooee/commands": minor
  "@tooee/config": minor
  "@tooee/search": minor
  "@tooee/themes": patch
---

## Clarify command, color mode, and readonly APIs

Command consumers can use `useSurfaceInvoke`, `useLatest`, `useLazyRef`, and
`formatStepKey` from `@tooee/commands`. `useCommandContext` remains available as
a deprecated compatibility alias. Command registry maps and search match arrays
are now readonly.

Color mode consumers can use `ColorMode` from `@tooee/config`. The old `Mode`
name remains available as a deprecated alias. Theme defaults now resolve from
the bundled Tokyo Night document and the complete fallback map owns the resolved
theme key list.
