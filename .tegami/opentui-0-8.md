---
packages:
  "group:tooee": minor
---

## Require OpenTUI 0.8.3

All Tooee packages now require `@opentui/core` and `@opentui/react` `^0.8.3`. Update both dependencies together when upgrading Tooee. Row documents use the native ScrollBox geometry, and command and theme pickers keep their rows visible with OpenTUI's zero-size layout rule. Long Ask prompts keep an editor row visible.

`RowDocumentRenderable` inherits OpenTUI's ScrollBox facade parts: `content`, `viewport`, `wrapper`, and scrollbars are no longer renderables. Read their geometry properties (for example `content.height`) instead of `getLayout()`.
