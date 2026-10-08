/** Detail tabs and their hotkeys. */

export const DETAIL_TABS = [
  { hotkey: "1", id: "docs", label: "Docs" },
  { hotkey: "2", id: "source", label: "Source" },
  { hotkey: "3", id: "preview", label: "Preview" },
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number]["id"];
