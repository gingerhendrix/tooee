import { describe, expect, test } from "bun:test";

import { cellGeometry, DEFAULT_CELL_GEOMETRY, naturalImageBox } from "../src/image-size.js";

describe("cellGeometry", () => {
  test("falls back when the terminal reports no pixel size", () => {
    expect(cellGeometry({ resolution: null, terminalHeight: 40, terminalWidth: 100 })).toEqual(
      DEFAULT_CELL_GEOMETRY
    );
  });

  test("derives cell width and aspect from the pixel resolution", () => {
    expect(
      cellGeometry({
        resolution: { height: 800, width: 1000 },
        terminalHeight: 40,
        terminalWidth: 100,
      })
    ).toEqual({ aspect: 2, cellWidth: 10 });
  });
});

describe("naturalImageBox", () => {
  // 10 x 20 pixel cells.
  const geometry = { aspect: 2, cellWidth: 10 };

  test("keeps a small image at one image pixel per screen pixel", () => {
    expect(naturalImageBox(400, 200, geometry, { maxCols: 120, maxRows: 40 })).toEqual({
      cols: 40,
      rows: 10,
    });
  });

  test("never enlarges an image smaller than one cell", () => {
    expect(naturalImageBox(4, 4, geometry, { maxCols: 120, maxRows: 40 })).toEqual({
      cols: 1,
      rows: 1,
    });
  });

  test("shrinks a wide image to the available columns and keeps its ratio", () => {
    expect(naturalImageBox(2000, 200, geometry, { maxCols: 100, maxRows: 40 })).toEqual({
      cols: 100,
      rows: 5,
    });
  });

  test("shrinks a tall image to the row limit and keeps its ratio", () => {
    expect(naturalImageBox(400, 2000, geometry, { maxCols: 120, maxRows: 40 })).toEqual({
      cols: 16,
      rows: 40,
    });
  });

  test("uses a requested column count in place of the pixel width", () => {
    expect(naturalImageBox(400, 200, geometry, { cols: 80, maxCols: 120, maxRows: 40 })).toEqual({
      cols: 80,
      rows: 20,
    });
    expect(naturalImageBox(400, 200, geometry, { cols: 80, maxCols: 60, maxRows: 40 })).toEqual({
      cols: 60,
      rows: 15,
    });
  });

  test("applies the row floor", () => {
    expect(naturalImageBox(400, 20, geometry, { maxCols: 120, maxRows: 40, minRows: 3 })).toEqual({
      cols: 40,
      rows: 3,
    });
  });
});
