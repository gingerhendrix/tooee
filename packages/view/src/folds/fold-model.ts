import type { Key } from "react";

/**
 * A foldable range of rows. `start` is the header row that stays visible;
 * `start + 1 ..= end` are the rows a closed fold hides. Indices point into the
 * full row array, and `key` is the header row's key, so closed state survives
 * row changes that keep keys stable.
 */
export interface FoldRange {
  key: Key;
  start: number;
  end: number;
}

/** The visible projection of a full row array under a set of closed folds. */
export interface FoldView {
  /** Full-array index of each visible row, in order. */
  visibleToSource: readonly number[];
  /** Visible index of each full-array row, or `-1` when a closed fold hides it. */
  sourceToVisible: readonly number[];
  /** Hidden row count for each closed header, keyed by the header's visible index. */
  hiddenCounts: ReadonlyMap<number, number>;
}

/**
 * Project `rowCount` rows through the closed folds. A closed range hides its
 * body even when it sits inside another closed range; the outermost header
 * shown carries the count of every row hidden below it.
 */
export const computeFoldView = function computeFoldView(
  rowCount: number,
  ranges: readonly FoldRange[],
  closedKeys: ReadonlySet<Key>
): FoldView {
  const closedEnds = new Map<number, number>();
  for (const range of ranges) {
    if (range.end > range.start && closedKeys.has(range.key)) {
      closedEnds.set(range.start, Math.max(closedEnds.get(range.start) ?? range.end, range.end));
    }
  }

  const visibleToSource: number[] = [];
  const sourceToVisible: number[] = Array.from({ length: rowCount }, () => -1);
  const hiddenCounts = new Map<number, number>();
  let hiddenUntil = -1;
  for (let index = 0; index < rowCount; index += 1) {
    if (index <= hiddenUntil) {
      continue;
    }
    const visibleIndex = visibleToSource.length;
    visibleToSource.push(index);
    sourceToVisible[index] = visibleIndex;
    const end = closedEnds.get(index);
    if (end !== undefined) {
      hiddenUntil = Math.min(end, rowCount - 1);
      hiddenCounts.set(visibleIndex, hiddenUntil - index);
    }
  }

  return { hiddenCounts, sourceToVisible, visibleToSource };
};

/** Ranges that contain `row` (header included), innermost first. */
export const foldsAt = function foldsAt(
  ranges: readonly FoldRange[],
  row: number
): readonly FoldRange[] {
  return ranges
    .filter((range) => range.end > range.start && range.start <= row && row <= range.end)
    .toSorted((left, right) => right.start - left.start || left.end - right.end);
};

/**
 * Keys of the closed ranges that hide `row`: closed ranges whose body
 * (`start + 1 ..= end`) contains it. Opening them all makes `row` visible.
 */
export const closedFoldsHiding = function closedFoldsHiding(
  ranges: readonly FoldRange[],
  closedKeys: ReadonlySet<Key>,
  row: number
): Key[] {
  return ranges
    .filter((range) => closedKeys.has(range.key) && range.start < row && row <= range.end)
    .map((range) => range.key);
};

/**
 * The full-array row the cursor should rest on once `view` applies: `row`
 * itself when it stays visible, otherwise the nearest visible row before it,
 * which is the header of the outermost closed fold that hides it.
 */
export const visibleAnchorRow = function visibleAnchorRow(view: FoldView, row: number): number {
  for (let index = Math.min(row, view.sourceToVisible.length - 1); index >= 0; index -= 1) {
    if ((view.sourceToVisible[index] ?? -1) !== -1) {
      return index;
    }
  }
  return row;
};
