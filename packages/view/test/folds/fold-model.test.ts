import { describe, expect, test } from "bun:test";

import { computeFoldView, foldsAt, visibleAnchorRow } from "../../src/folds/fold-model.js";
import type { FoldRange } from "../../src/folds/fold-model.js";

// 0 H1 | 1 p | 2 H2 | 3 p | 4 H3 | 5 p | 6 H2 | 7 p
const RANGES: readonly FoldRange[] = [
  { end: 7, key: 0, start: 0 },
  { end: 5, key: 2, start: 2 },
  { end: 5, key: 4, start: 4 },
  { end: 7, key: 6, start: 6 },
];

describe("computeFoldView", () => {
  test("shows every row when no fold is closed", () => {
    const view = computeFoldView(8, RANGES, new Set());
    expect(view.visibleToSource).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(view.sourceToVisible).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(view.hiddenCounts.size).toBe(0);
  });

  test("hides the body of a closed fold and counts it on the header", () => {
    const view = computeFoldView(8, RANGES, new Set([2]));
    expect(view.visibleToSource).toEqual([0, 1, 2, 6, 7]);
    expect(view.sourceToVisible).toEqual([0, 1, 2, -1, -1, -1, 3, 4]);
    expect([...view.hiddenCounts]).toEqual([[2, 3]]);
  });

  test("an outer fold hides closed inner folds and keeps their state", () => {
    const both = computeFoldView(8, RANGES, new Set([2, 4]));
    expect(both.visibleToSource).toEqual([0, 1, 2, 6, 7]);
    expect([...both.hiddenCounts]).toEqual([[2, 3]]);

    const innerOnly = computeFoldView(8, RANGES, new Set([4]));
    expect(innerOnly.visibleToSource).toEqual([0, 1, 2, 3, 4, 6, 7]);
    expect([...innerOnly.hiddenCounts]).toEqual([[4, 1]]);
  });

  test("ignores closed keys with no range and ranges with no body", () => {
    const view = computeFoldView(3, [{ end: 1, key: 1, start: 1 }], new Set([1, 99]));
    expect(view.visibleToSource).toEqual([0, 1, 2]);
  });

  test("clamps a range that runs past the row count", () => {
    const view = computeFoldView(4, [{ end: 9, key: 0, start: 0 }], new Set([0]));
    expect(view.visibleToSource).toEqual([0]);
    expect([...view.hiddenCounts]).toEqual([[0, 3]]);
  });
});

describe("foldsAt", () => {
  test("lists ranges that contain a row, innermost first", () => {
    expect(foldsAt(RANGES, 5).map((range) => range.key)).toEqual([4, 2, 0]);
    expect(foldsAt(RANGES, 4).map((range) => range.key)).toEqual([4, 2, 0]);
    expect(foldsAt(RANGES, 1).map((range) => range.key)).toEqual([0]);
    expect(foldsAt([], 1)).toEqual([]);
  });
});

describe("visibleAnchorRow", () => {
  test("keeps a visible row and moves a hidden row to the outermost closed header", () => {
    const view = computeFoldView(8, RANGES, new Set([2, 4]));
    expect(visibleAnchorRow(view, 7)).toBe(7);
    expect(visibleAnchorRow(view, 5)).toBe(2);
    expect(visibleAnchorRow(view, 3)).toBe(2);
  });
});
