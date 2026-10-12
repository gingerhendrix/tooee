---
packages:
  "@tooee/router": minor
---

## `RouterProvider` accepts a router made with `context`

`RouterProvider` now accepts a router created with `createRouter({ context })`. Before, the `router` prop had the type `RouterInstance` with no type argument, so TypeScript rejected a router with an app context.

`useRouter()` now returns `RouterInstance<unknown>`, because the provider can hold a router with any context type. Code that reads `useRouter().context` must check the value before use.
