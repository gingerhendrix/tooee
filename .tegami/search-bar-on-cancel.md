---
packages:
  "@tooee/search": patch
  "@tooee/layout": patch
---

## `SearchBar.onCancel` is optional and deprecated

`SearchBar` never called `onCancel`. Escape reaches the `search-cancel` command that `useSearchBindings` registers, and that command cancels the search. The prop is now optional and marked deprecated, and `AppLayout` no longer passes it. A later release will remove it.
