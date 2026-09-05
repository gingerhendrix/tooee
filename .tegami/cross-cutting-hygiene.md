---
packages:
  "group:tooee": minor
---

## Clarify package ownership and compatibility APIs

The low-level command store APIs now come from `@tooee/commands/store`. This entry owns
`CommandStoreInstance`, `ContextGetter`, `CreateCommandStoreOptions`, `KeyDispatchResult`,
`selectSurfaceCommandMap`, `selectGroups`, `ModeProvider`, `ModeProviderProps`,
`SequenceTracker`, its related sequence types, `createBaseStore`, and `createCommandStore`.
These names are no longer exported from the main `@tooee/commands` entry.

`CloseButton` moved from `@tooee/themes` to `@tooee/layout`. The `rankBy` compatibility
re-export was removed from `@tooee/renderers`; import it from `@tooee/fuzzy`.

The overlay store event payload types `OverlayClosedEmit`, `OverlayClosedEvent`,
`OverlayClosedTopEvent`, `OverlayOpenedEvent`, `OverlayStoreEvents`, and `OverlayUpdatedEvent`
are no longer exported from `@tooee/overlays`. `AnyRoute`, `ScreenFocusProvider`, and
`getRouteChain` are no longer exported from `@tooee/router`.

`useCommandContext` is deprecated in favor of `useSurfaceInvoke`. The overlay controller
methods `show`, `hide`, and `isOpen` are deprecated in favor of the handle returned by `open`
and overlay state hooks.
