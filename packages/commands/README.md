# @tooee/commands

Vim-inspired modal command system for Tooee.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Command-context extensions

Packages extend `CommandContext` with TypeScript module augmentation and provide
runtime values with command-context providers. Use `useProvideCommandContextKey`
for one keyed slice so the value is checked against the augmented key:

```tsx
declare module "@tooee/commands" {
  interface CommandContext {
    myApp: { selectedId: string | null };
  }
}

useProvideCommandContextKey("myApp", () => ({ selectedId }));
```

Key ownership is by convention: Tooee packages use short built-in keys such as
`view`, `ask`, `choose`, `overlay`, and `toast`; apps and third-party packages
should use app/package-specific keys to avoid collisions. If multiple providers
return the same top-level key, the last registered provider wins.

## Command surfaces & arbitration

Commands register on a **surface**. The root app is the implicit base surface;
`CommandSurfaceProvider` nests another one with its own registry and local mode.
Each surface has a role:

- **`modal`** — while topmost it owns keyboard input and **swallows** every key,
  suspending all lower surfaces (including the root) even for keys it does not
  handle. This is the overlay model.
- **`panel`** — a _peer_ surface that owns input only while it is its group's
  active panel (see [`@tooee/panels`](../panels)). Selection is by activation,
  not stack depth/order. Unlike a modal, an active panel does **not** swallow:
  keys it neither matches nor holds a pending chord for **fall through** to the
  enclosing surface.
- **`passive`** — never owns input; purely visual (e.g. which-key).

Key dispatch arbitrates in this order:

```text
topmost modal  →  active panel  →  root
```

**Fall-through & shadowing.** With no modal present, a key is offered to the
active panel first. If the panel matches (or holds a multi-step chord), it wins
— a panel command therefore **shadows** a root command bound to the same hotkey
while that panel is active. If the panel does not match, the key falls through to
the root, except when the active panel's local mode is `insert`: editor/input
keys never fall through in insert mode. Once any surface holds a pending chord it owns subsequent keys until
the chord resolves or times out. Any change of keyboard ownership (activation
switch, a modal opening over a panel, a mode change) clears the pending chord and
key buffer.

**Panel activation** lives in the store as `activePanels` (a `groupId → panelId`
map); `CommandStore` exposes `activatePanel` / `removePanelGroup`, and a
`"panel"`-role `CommandSurfaceProvider` takes a `groupId`. Only groups on the
active panel ancestry publish activation, so a nested group mounted in an
inactive outer panel cannot win input. `@tooee/panels` wraps all of this — apps
use `PanelGroup`/`Panel` rather than these primitives.

**Surface-aware hooks.** `useActiveCommandSurface()` returns the keyboard owner
(modal → active panel → `null` at root). `useSurfaceCommands()` defaults to that
owner. `useEffectiveCommands()` returns the palette's effective set under normal
fall-through — the active panel's commands plus non-shadowed root commands, with
invocation routed to the owning surface. The shell palette uses the active
panel's local mode; if opened programmatically during panel insert mode it omits
root commands, matching the editor-safe dispatch boundary.

## Raw `useKeyboard` policy

App-level `useKeyboard` handlers MUST guard against active overlays — either
stand down while an overlay is open, or be ported to `useCommand` registrations
so the dispatcher arbitrates them:

```tsx
const hasOverlay = useHasOverlay(); // from @tooee/overlays

useKeyboard((key) => {
  if (hasOverlay) return;
  // ...
});
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

Renderable focus is the one thing the surface stack does not manage: compare
`useCommandSurfaceId()` (the surface a subtree registers to) against
`useActiveCommandSurface()` to blur an editor while a modal surface above it
owns the keyboard.
