/**
 * Fit status bar items into a fixed cell width. The function is pure, so the
 * same items and width always give the same bar.
 */

import { cellWidth, truncateCells } from "./cell-text.js";
import type { TruncateMode } from "./cell-text.js";

export type StatusBarTruncate = TruncateMode;

export type StatusBarAlign = "end" | "start";

/**
 * Suggested priorities for status bar items. Higher values stay longer when
 * the bar is narrow. Any number works; these names give apps a shared scale.
 */
export const StatusPriority = {
  /** Background facts, such as the theme name. The default. */
  background: 0,
  /** Content facts, such as format or line count. */
  content: 1,
  /** Must always show, such as a session phase or an error state. */
  critical: 4,
  /** State the user acts on, such as a selection, a search query, or the current file. */
  focus: 2,
  /** Key hints. They go first. */
  hint: -1,
  /** Current mode and position. */
  position: 3,
} as const;

export interface StatusBarItem {
  label: string;
  value?: string;
  /** Stable React key. Falls back to the position and label. */
  id?: string;
  /** Higher values stay longer. Default 0. See `StatusPriority`. */
  priority?: number;
  /** `"end"` items sit at the right edge. Default `"start"`. */
  align?: StatusBarAlign;
  /** Shorter form. The bar uses it before any item shortens or hides. */
  compact?: { label?: string; value?: string };
  /** The value can shorten with an ellipsis. Default: no truncation. */
  truncate?: StatusBarTruncate;
  /** Smallest value width in cells after truncation. Default 8. */
  minValueWidth?: number;
}

export interface PlacedStatusItem {
  key: string;
  label: string;
  value: string;
}

export interface StatusBarLayout {
  start: PlacedStatusItem[];
  end: PlacedStatusItem[];
  /** Number of items that did not fit. */
  hidden: number;
  /** The glyph to show after the start group, or null when no marker shows. */
  marker: string | null;
}

export interface FitStatusBarOptions {
  /** Glyph that shows when items hide. `false` turns it off. Default `"⋯"`. */
  hiddenMarker?: string | false;
}

/** Cells between items, and the least space between the start and end groups. */
export const STATUS_BAR_GAP = 2;

/** Default glyph that shows when items hide. */
export const STATUS_BAR_HIDDEN_MARKER = "⋯";

const DEFAULT_MIN_VALUE_WIDTH = 8;

interface ItemState {
  item: StatusBarItem;
  index: number;
  compact: boolean;
  /** Value width cap after truncation, or null for the full value. */
  valueCap: number | null;
  visible: boolean;
}

interface FitState {
  items: ItemState[];
  marker: string;
  markerOn: boolean;
}

const alignOf = function alignOf(state: ItemState): StatusBarAlign {
  return state.item.align ?? "start";
};

const labelOf = function labelOf(state: ItemState): string {
  return state.compact ? (state.item.compact?.label ?? state.item.label) : state.item.label;
};

const rawValueOf = function rawValueOf(state: ItemState): string {
  const full = state.item.value ?? "";

  return state.compact ? (state.item.compact?.value ?? full) : full;
};

const valueOf = function valueOf(state: ItemState): string {
  const raw = rawValueOf(state);

  if (state.valueCap === null) {
    return raw;
  }

  return truncateCells(raw, state.valueCap, state.item.truncate);
};

/** Cells between the label and the value: one space when both show. */
const labelGap = function labelGap(label: string, value: string): number {
  return label !== "" && value !== "" ? 1 : 0;
};

const itemWidth = function itemWidth(state: ItemState): number {
  const label = labelOf(state);
  const value = valueOf(state);

  return cellWidth(label) + labelGap(label, value) + cellWidth(value);
};

const groupWidth = function groupWidth(widths: readonly number[]): number {
  const content = widths.reduce((sum, width) => sum + width, 0);

  return content + Math.max(0, widths.length - 1) * STATUS_BAR_GAP;
};

const hiddenCount = function hiddenCount(fit: FitState): number {
  return fit.items.filter((state) => !state.visible).length;
};

const showsMarker = function showsMarker(fit: FitState): boolean {
  return fit.markerOn && fit.marker !== "" && hiddenCount(fit) > 0;
};

const barWidth = function barWidth(fit: FitState): number {
  const visible = fit.items.filter((state) => state.visible);
  const start = visible.filter((state) => alignOf(state) === "start").map(itemWidth);
  const end = visible.filter((state) => alignOf(state) === "end").map(itemWidth);

  if (showsMarker(fit)) {
    start.push(cellWidth(fit.marker));
  }

  const between = start.length > 0 && end.length > 0 ? STATUS_BAR_GAP : 0;

  return groupWidth(start) + between + groupWidth(end);
};

/** Lowest priority first. On a tie, the item further right gives way first. */
const reductionOrder = function reductionOrder(items: readonly ItemState[]): ItemState[] {
  return items.toSorted(
    (a, b) => (a.item.priority ?? 0) - (b.item.priority ?? 0) || b.index - a.index
  );
};

const applyCompactForms = function applyCompactForms(
  order: readonly ItemState[],
  overflow: () => number
): void {
  for (const state of order) {
    if (overflow() <= 0) {
      return;
    }

    if (state.item.compact !== undefined) {
      state.compact = true;
    }
  }
};

const shortenOrHide = function shortenOrHide(
  fit: FitState,
  order: readonly ItemState[],
  overflow: () => number
): void {
  for (const state of order) {
    if (overflow() <= 0) {
      return;
    }

    const raw = rawValueOf(state);

    if (state.item.truncate !== undefined && raw !== "") {
      const rawWidth = cellWidth(raw);
      const min = Math.min(rawWidth, state.item.minValueWidth ?? DEFAULT_MIN_VALUE_WIDTH);
      state.valueCap = Math.max(min, rawWidth - overflow());

      if (overflow() <= 0) {
        return;
      }
    }

    const visibleCount = fit.items.filter((item) => item.visible).length;

    if (visibleCount > 1) {
      state.visible = false;
    }
  }
};

/** Cells left for the value when the item has `room` cells. */
const valueRoom = function valueRoom(state: ItemState, room: number): number {
  const label = labelOf(state);

  return Math.max(0, room - cellWidth(label) - (label === "" ? 0 : 1));
};

/** The last item never hides. Shorten its value, then drop the marker if needed. */
const squeezeLastItem = function squeezeLastItem(
  fit: FitState,
  width: number,
  overflow: () => number
): void {
  const last = fit.items.find((state) => state.visible);

  if (last === undefined || overflow() <= 0) {
    return;
  }

  const markerRoom = showsMarker(fit) ? cellWidth(fit.marker) + STATUS_BAR_GAP : 0;

  last.valueCap = valueRoom(last, width - markerRoom);

  if (overflow() > 0 && showsMarker(fit)) {
    fit.markerOn = false;
    last.valueCap = valueRoom(last, width);
  }
};

/** Visible compact items try their full form again, highest priority first. */
const restoreFullForms = function restoreFullForms(
  order: readonly ItemState[],
  overflow: () => number
): void {
  for (const state of order.toReversed()) {
    if (state.visible && state.compact) {
      state.compact = false;

      if (overflow() > 0) {
        state.compact = true;
      }
    }
  }
};

const place = function place(state: ItemState): PlacedStatusItem {
  return {
    key: state.item.id ?? `${state.index}:${state.item.label}`,
    label: labelOf(state),
    value: valueOf(state),
  };
};

/**
 * Fit `items` into `width` cells:
 *
 * 1. Use full forms if every item fits.
 * 2. Switch items to compact forms, lowest priority first.
 * 3. Lowest priority first: shorten a truncatable value to its minimum, then hide the item.
 * 4. Never hide the last item. Shorten its value if it still overflows.
 * 5. Give full forms back to visible items, highest priority first, where they fit.
 *
 * When items hide, a marker glyph shows after the start group.
 */
export const fitStatusBar = function fitStatusBar(
  items: readonly StatusBarItem[],
  width: number,
  options: FitStatusBarOptions = {}
): StatusBarLayout {
  const fit: FitState = {
    items: items.map((item, index) => ({
      compact: false,
      index,
      item,
      valueCap: null,
      visible: true,
    })),
    marker:
      options.hiddenMarker === false ? "" : (options.hiddenMarker ?? STATUS_BAR_HIDDEN_MARKER),
    markerOn: true,
  };

  const order = reductionOrder(fit.items);

  const overflow = (): number => barWidth(fit) - width;

  applyCompactForms(order, overflow);
  shortenOrHide(fit, order, overflow);
  squeezeLastItem(fit, width, overflow);
  restoreFullForms(order, overflow);

  const visible = fit.items.filter((state) => state.visible);

  return {
    end: visible.filter((state) => alignOf(state) === "end").map(place),
    hidden: hiddenCount(fit),
    marker: showsMarker(fit) ? fit.marker : null,
    start: visible.filter((state) => alignOf(state) === "start").map(place),
  };
};
