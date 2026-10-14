import { describe, expect, test } from "bun:test";

import { fitTableColumnWidths, tableBorderLine } from "../src/markdown/table-layout.js";

describe("fitTableColumnWidths", () => {
  test("keeps natural widths that fit", () => {
    expect(fitTableColumnWidths([4, 6, 2], 20)).toEqual([4, 6, 2]);
  });

  test("narrows the widest columns first and uses the whole budget", () => {
    const widths = fitTableColumnWidths([3, 20, 30], 30);

    expect(widths).toEqual([3, 14, 13]);
    expect(widths.reduce((sum, width) => sum + width, 0)).toBe(30);
  });

  test("gives every column at least one cell", () => {
    expect(fitTableColumnWidths([10, 10, 10], 1)).toEqual([1, 1, 1]);
  });
});

describe("tableBorderLine", () => {
  test("joins one run per column", () => {
    expect(tableBorderLine([2, 3], "├", "┼", "┤")).toBe("├──┼───┤");
  });
});
