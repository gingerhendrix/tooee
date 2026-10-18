import { describe, expect, test } from "bun:test";

import { cellGeometry, DEFAULT_CELL_GEOMETRY, imageBoxSize } from "../src/sizing.js";

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

describe("imageBoxSize", () => {
  const geometry = { aspect: 2, cellWidth: 10 };

  test("keeps a small diagram at its natural size", () => {
    expect(imageBoxSize(400, 200, geometry, { maxCols: 120, maxRows: 40 })).toEqual({
      cols: 40,
      rows: 10,
    });
  });

  test("shrinks a wide diagram to the available columns", () => {
    expect(imageBoxSize(2000, 200, geometry, { maxCols: 100, maxRows: 40 })).toEqual({
      cols: 100,
      rows: 5,
    });
  });

  test("caps a tall diagram at the row limit and narrows it to keep the ratio", () => {
    expect(imageBoxSize(400, 2000, geometry, { maxCols: 120, maxRows: 40 })).toEqual({
      cols: 16,
      rows: 40,
    });
  });
});
