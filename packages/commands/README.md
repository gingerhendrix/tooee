# @tooee/commands

Vim-inspired modal command system for Tooee.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Raw `useKeyboard` policy

App-level `useKeyboard` handlers MUST guard against active overlays — either
stand down while an overlay is open, or be ported to `useCommand` registrations
so the dispatcher arbitrates them:

```tsx
const hasOverlay = useHasOverlay() // from @tooee/overlays

useKeyboard((key) => {
  if (hasOverlay) return
  // ...
})
```

Why `key.preventDefault()` is **not** sufficient:

- `useKeyboard` subscribes in an effect, and React runs child effects before
  parent effects, so app-level raw handlers fire **before** the command
  dispatcher. A modal surface's `preventDefault` cannot reach them even in
  principle.
- The dispatcher only calls `preventDefault()` on keys a command **matches**;
  keys a modal surface merely swallows are never marked, so raw listeners see
  them unprevented.

An unguarded raw handler therefore double-handles keys while a modal overlay
(theme picker, command palette, choose/ask overlays) is open — e.g. Escape
exiting the app underneath an open picker. Inside `@tooee/commands` itself,
`useActiveCommandSurface()` can serve as the guard where `@tooee/overlays` is
not available. There is a regression test documenting this hazard in
`test/surface.test.tsx` ("raw useKeyboard consumers bypass surface
arbitration").
