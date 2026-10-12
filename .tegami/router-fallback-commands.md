---
packages:
  "@tooee/router": minor
  "@tooee/commands": minor
---

## Quit and retry from a route's pending or error screen

While a route's pending or error component replaces the screen, the screen's own commands are unmounted. Before, an app that bound `q` only inside its screens could not quit from a failed load. Now, inside a `CommandProvider`, the router registers two fallback commands while the pending or error component shows:

- `q` calls `ctx.exit()`.
- `r` runs the route loader again. This command exists only on the error screen.

Commands that the app or the error component registers on the same keys run first.

The `errorComponent` now gets a `retry` prop next to `error`. The props type is exported as `RouteErrorProps`.

`@tooee/commands` exports `useHasCommandProvider()`, which tells a component whether a `CommandProvider` is above it.
