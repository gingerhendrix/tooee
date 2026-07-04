# Store conventions

Tooee models stateful interaction systems (command registry, surface stack,
overlay stack, sequence display, nav/search) as explicit event-driven stores
built on `@xstate/store`, with thin React adapters on top. This note records
when to reach for a store, where store code lives, and how it is tested.

Rule of thumb: **transition logic moves into store events; IO stays at the
boundary.** An effect that only _repairs state after render_ is a store
transition in disguise. An effect that talks to a renderer, timer, stream, or
process is doing its job.

## When to use what

| Situation                                                                                                                                                       | Use                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Synchronous state updated by named events; cross-component; needs subscription/selectors (registry, surface stack, overlay stack, nav/search, sequence display) | `@xstate/store`                                                                                                         |
| Async lifecycles with real states and cancellable work (content loader)                                                                                         | `@xstate/store` + request-ids first; full `xstate` only if a written justification shows the statechart pays for itself |
| Component-local input state that never crosses a component boundary (a filter query local to one overlay, a focus flag)                                         | React `useState`                                                                                                        |
| Purely derived render data                                                                                                                                      | `useMemo`/selectors — never an effect, never a store                                                                    |
| Imperative OpenTUI ref sync, subscriptions, timers, async IO                                                                                                    | effects (or store-adjacent wrappers) — these are legitimate external synchronization and stay effects                   |

## File layout

```
packages/<pkg>/src/<domain>-store.ts     # createXxxStore() factory: context type, events, pure transitions, selectors. No React imports.
packages/<pkg>/src/use<Domain>.ts        # React wrappers: context provider plumbing, useSelector hooks. (May be folded into an existing provider file when the provider is the only consumer.)
```

- Stores are **per-provider instances** created by a factory
  (`createCommandStore(options)`), never module-level singletons — tests and
  multiple app roots need isolated instances.
- Selectors are exported from the store file as named pure functions
  (`selectActiveModalSurface(ctx)`) so pure tests and React hooks share them.
- Side effects (callbacks, mode restoration, handler invocation) leave the
  store via emitted events (`enqueue.emit.*` / `store.on`) or via a thin
  imperative wrapper that owns IO-adjacent state (timers, key buffers) and is
  the store's single writer.

## Event typing

Stray event names must be compile errors. Two equivalent, accepted ways to
get there:

- **Handler inference** (commands store): type each transition's `event`
  parameter inline and let `createStore` infer the event payload map from
  `on`. Works when the store emits nothing.
- **Explicit closed generics** (overlay store): declare event/emitted payload
  map types and pass them as `createStore<TContext, TEvents, TEmitted>`
  generics. Required when transitions `enqueue.emit`, since v4 removed the
  `emits` config.

Either way the payload maps must stay **closed**: never add a
`[key: string]: ...` index signature to satisfy a constraint — it silently
makes every `trigger.*`/`emit.*`/`send`/`on` name compile.
`overlay-store.typecheck.ts` pins this with `@ts-expect-error` assertions
checked by `tsc -b`. v4's `schemas` config (Standard Schema) is for runtime
validation and type inference from schema libraries; do not add type-only
schema objects just for event-name strictness — the generics already provide
it.

## Testing pattern

1. **Pure transition tests first** (`test/<domain>-store.test.ts`): create
   store, trigger events, assert snapshots/selectors/emits. No React, no
   renderer. This is the bulk of coverage.
2. **Minimal React tests second**: only for the adapter seams — hook
   reactivity, provider wiring, arbitration visible through rendering. Use the
   existing `test/support/test-render.ts` harness.

## Selector discipline (TUI render cost)

TUI frames are expensive; store subscriptions must not cause avoidable
re-renders.

- Components subscribe with `useSelector(store, selector)` and the
  **narrowest selector that answers the question** (`selectHasOverlay`, not
  the whole stack; `selectActiveSurfaceMeta`, not the surfaces array).
- Selectors returning fresh arrays/objects must either be memoized against
  context identity or passed an equality function; prefer selecting primitives
  and stable references.
- Transitions must preserve reference identity of untouched slices
  (spread-copy only the slice that changed) so selector equality checks
  short-circuit.
- Never subscribe a hot render path (per-row components) to a store that
  changes per keystroke; select at the provider/container level and pass
  values down.

## Dependency policy

`@xstate/store` (v4) is the only store dependency, plus `@xstate/store-react`
(v2) for the React `useSelector` adapter in packages with React seams (v4
moved framework adapters out of the core package). Do not add full `xstate`
(statecharts, actors) without a written justification in the relevant design
doc — synchronous UI transitions do not earn it.

## One lifecycle: surfaces and overlays

The command surface stack (`@tooee/commands`) and the overlay stack
(`@tooee/overlays`) are separate stores in separate packages, but they model
one lifecycle: opening an overlay with `ownCommands` mounts a command surface;
closing it pops the surface. `@tooee/overlays` must not depend on
`@tooee/commands`; the shell's `OverlayProvider` is the bridge that ties the
two stores together (mode restoration, sequence reset on same-id overlay
replacement).
