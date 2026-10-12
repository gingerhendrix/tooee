---
packages:
  "@tooee/view": minor
---

## `launch()` accepts `onMarkdownLinkActivate`

`launch()` from `@tooee/view` now takes the `onMarkdownLinkActivate` option that the `View` component already had. The handler runs when the user activates a Markdown link with the mouse or with Enter on the cursor line. It replaces the default handling: `linkHandlers`, local file navigation, and the stdin "Links need a source file" toast.
