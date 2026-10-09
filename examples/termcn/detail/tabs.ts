/** Detail tabs and their hotkeys. The first tab opens by default. */

export const DETAIL_TABS = [
  { hotkey: "1", id: "preview", label: "Preview" },
  { hotkey: "2", id: "docs", label: "Docs" },
  { hotkey: "3", id: "source", label: "Source" },
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number]["id"];

export const DEFAULT_DETAIL_TAB: DetailTab = DETAIL_TABS[0].id;
