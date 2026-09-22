---
packages:
  "@tooee/search": patch
  "@tooee/shell": patch
---

## `g g` and `G` bring back their row after a wheel scroll

Before, `g g` and `G` did nothing when the cursor was already on the first or last row and the view was scrolled away from it. Now a document scrolls that row back into view. With `followTail`, `G` also pins the view to the bottom again.

The nav-search store now emits `jumped` for every `jump` that lands on a row, also when the cursor does not move.
