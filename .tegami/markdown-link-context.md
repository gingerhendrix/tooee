---
packages:
  "@tooee/view": patch
---

## Provide View context when Markdown links activate

Markdown link handlers on `View` now receive the live command context with the raw link URL. Existing one-argument handlers continue to work.
