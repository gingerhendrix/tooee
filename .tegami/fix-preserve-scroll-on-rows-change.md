---
packages:
  "@tooee/shell": patch
---

## Keep the scroll position when document rows update

Documents built on `useDocumentController` no longer jump back to the cursor row when their rows change. Streamed rows and in-place text updates now keep a wheel-scrolled viewport where it is. The view still follows the cursor when the cursor moves.
