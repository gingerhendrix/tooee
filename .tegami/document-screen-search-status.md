---
packages:
  "@tooee/shell": patch
---

## Remove the unused `Search:` status item from `DocumentScreen`

`DocumentScreen` built a `Search:` status item only while the search bar was open. The search bar replaces the status bar then, so the item never showed. The dead item is gone. The search bar still shows the query and the match count while it is open.
