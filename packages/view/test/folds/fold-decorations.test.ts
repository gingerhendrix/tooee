import { describe, expect, test } from "bun:test";

import type { DecorationLayer, RowDecoration } from "@tooee/renderers";

import { projectDecorationLayers } from "../../src/folds/fold-decorations.js";
import { computeFoldView } from "../../src/folds/fold-model.js";

const everyRowLayer: DecorationLayer = {
  *forVisibleRows(from: number, to: number): Generator<RowDecoration> {
    for (let row = from; row <= to; row += 1) {
      yield { background: `#00000${row}`, row };
    }
  },
  priority: 7,
};

describe("projectDecorationLayers", () => {
  test("maps full-array rows to visible rows and drops hidden rows", () => {
    // Rows 2..4 are hidden under the header at row 1.
    const view = computeFoldView(6, [{ end: 4, key: 1, start: 1 }], new Set([1]));
    const [layer] = projectDecorationLayers([everyRowLayer], view);
    expect(layer?.priority).toBe(7);
    expect([...(layer?.forVisibleRows(0, 2) ?? [])]).toEqual([
      { background: "#000000", row: 0 },
      { background: "#000001", row: 1 },
      { background: "#000005", row: 2 },
    ]);
  });

  test("yields nothing for a range past the visible rows", () => {
    const view = computeFoldView(3, [], new Set());
    const [layer] = projectDecorationLayers([everyRowLayer], view);
    expect([...(layer?.forVisibleRows(5, 8) ?? [])]).toEqual([]);
  });
});
