---
packages:
  "@tooee/search": patch
---

## Prevent repeated equivalent search updates

Search rematches now keep the current match and avoid repeated store updates when the query and ordered results stay the same.
