---
packages:
  "@tooee/search": patch
---

## `n` and `N` skip rows the cursor cannot stop on

`searchNext` and `searchPrevious` now move the cursor to the nearest selectable row in the search direction, the same way typing and Enter already do. Before, `n` and `N` could put the cursor on a row that `isSelectable` rejects.
