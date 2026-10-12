/** Sample status bar item sets and a plain-text renderer for layout tests. */
import { STATUS_BAR_GAP, StatusPriority } from "../src/fit-status-bar.js";
import type { PlacedStatusItem, StatusBarItem, StatusBarLayout } from "../src/fit-status-bar.js";

export const chatItems: StatusBarItem[] = [
  {
    compact: { label: "" },
    id: "model",
    label: "Model:",
    minValueWidth: 12,
    priority: StatusPriority.position,
    truncate: "middle",
    value: "openrouter/google/gemini-3.6-flash",
  },
  {
    compact: { label: "Think:" },
    id: "thinking",
    label: "Thinking:",
    priority: StatusPriority.focus,
    value: "medium",
  },
  { align: "end", id: "phase", label: "Pi:", priority: StatusPriority.critical, value: "ready" },
  {
    compact: { value: ": palette" },
    id: "keys",
    label: "",
    priority: StatusPriority.hint,
    value: "ctrl+o model · ctrl+t thinking · : palette · Esc then q quit",
  },
];

export const documentItems: StatusBarItem[] = [
  { id: "theme", label: "Theme:", value: "tokyonight" },
  { id: "format", label: "Format:", priority: StatusPriority.content, value: "markdown" },
  { id: "lines", label: "Lines:", priority: StatusPriority.content, value: "1284" },
  {
    id: "search",
    label: "Search:",
    minValueWidth: 6,
    priority: StatusPriority.focus,
    truncate: "end",
    value: "status bar overflow rules",
  },
  { align: "end", id: "mode", label: "Mode:", priority: StatusPriority.position, value: "cursor" },
  {
    align: "end",
    compact: { label: "Ln" },
    id: "cursor",
    label: "Cursor:",
    priority: StatusPriority.position,
    value: "412",
  },
];

export const diffItems: StatusBarItem[] = [
  {
    id: "file",
    label: "File:",
    minValueWidth: 12,
    priority: StatusPriority.focus,
    truncate: "start",
    value: "packages/layout/src/status-bar.tsx",
  },
  { id: "hunk", label: "Hunk:", priority: StatusPriority.content, value: "3/7" },
  { align: "end", id: "mode", label: "Mode:", priority: StatusPriority.position, value: "cursor" },
];

const itemText = function itemText(item: PlacedStatusItem): string {
  if (item.label === "") {
    return item.value;
  }

  return item.value === "" ? item.label : `${item.label} ${item.value}`;
};

/** The bar content as one line of plain text, padded to `width` when it has an end group. */
export const renderPlain = function renderPlain(layout: StatusBarLayout, width: number): string {
  const gap = " ".repeat(STATUS_BAR_GAP);
  const startParts = layout.start.map(itemText);

  if (layout.marker !== null) {
    startParts.push(layout.marker);
  }

  const start = startParts.join(gap);
  const end = layout.end.map(itemText).join(gap);

  if (end === "") {
    return start;
  }

  const minPad = start === "" ? 0 : STATUS_BAR_GAP;
  const pad = Math.max(minPad, width - Bun.stringWidth(start) - Bun.stringWidth(end));

  return start + " ".repeat(pad) + end;
};

export const visibleKeys = function visibleKeys(layout: StatusBarLayout): string[] {
  return [...layout.start, ...layout.end].map((item) => item.key);
};
