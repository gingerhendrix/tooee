---
packages:
  "@tooee/shell": minor
---

## Export `useNavigationBindings`

`@tooee/shell` now exports `useNavigationBindings(store, options)`. It registers the cursor, select and multi-select keys for a nav-search store that you own. Use it with `useNavSearchStore` and `useSearchBindings` from `@tooee/search` when one screen shares a store between navigation and search. Before, such a screen had to register its own movement keys.
