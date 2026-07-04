# @tooee/view

Terminal content viewer for markdown, code, text, and tables.

Part of the [Tooee](https://github.com/gingerhendrix/tooee) monorepo. See the main repo for documentation.

## Headless view command context

Custom surfaces that behave like a view, but do not render the built-in `View`
component, can publish the standard `ctx.view` command-context slice with
`useProvideViewCommandContext`:

```tsx
import { useProvideViewCommandContext } from "@tooee/view"

useProvideViewCommandContext({
  format: "stream-dashboard",
  title: "Stream Dashboard",
  nav,
  data: { rowCount: rows.length },
  extras: { activeRow, rowCount: rows.length },
})
```

The hook injects the live command mode and fills safe defaults for headless
surfaces: synthetic custom content, empty marks, an empty toggled-index set, and
no-op reload/mark mutators. Register only the view commands your custom surface
can actually honor; unsupported capabilities are intentionally inert defaults
rather than full feature implementations.

For tests or non-React integrations, `createViewCommandContext({ mode, ... })`
creates the same object shape directly. The builder requires the caller to own
the `mode` value; prefer the hook in React so mode cannot go stale.
