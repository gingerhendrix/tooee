---
packages:
  "@tooee/renderers": patch
  "@tooee/router": patch
  "@tooee/shell": patch
  "@tooee/view": patch
---

## Add named hook and table formatting contracts

Export named result and option types for router, shell, and view hooks. Export `formatTableCell` as the shared table value formatter. Date cells now use the same ISO text for display, whole-document copy, row copy, and search.
