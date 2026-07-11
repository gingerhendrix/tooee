export { useSearch } from "./search-hook.js"
export { useNavSearchStore, useSearchBindings } from "./search-hook.js"
export { createNavSearchStore } from "./nav-search-store.js"
export type {
  NavSearchStore,
  NavSearchContext,
  NavSearchEvents,
  RowKey,
} from "./nav-search-store.js"
export {
  selectCursor,
  selectRowKeys,
  selectSelectionAnchor,
  selectToggledKeys,
  selectSearchStatus,
  selectSearchActive,
  selectSearchQuery,
  selectMatches,
  selectCurrentMatchIndex,
  deriveSelection,
  resolveIndex,
} from "./nav-search-store.js"
export type { UseSearchOptions, SearchState } from "./search-hook.js"
export { findMatchingLines } from "./search.js"
export { SearchBar } from "./SearchBar.js"
export type { SearchBarProps } from "./SearchBar.js"
