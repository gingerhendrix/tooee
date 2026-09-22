---
packages:
  "@tooee/shell": minor
  "@tooee/renderers": minor
---

## Sticky-bottom follow for documents

`useDocumentController` takes a new `followTail` option for streamed rows. A followed document opens on its last row. While the viewport is at the bottom, it stays pinned there as rows arrive, and a cursor on the last row moves to the new last row. Scroll up to stop following. Scroll back to the bottom to follow again. `Document` turns on the scroll box's sticky-bottom scroll for you.

`RowDocumentRenderable` has a new `isScrolledToBottom()` method.
