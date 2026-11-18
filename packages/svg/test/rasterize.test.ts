import { describe, expect, test } from "bun:test";

import { findRasterFonts, limitRasterScale, rasterizeSvg } from "../src/rasterize.js";

describe("findRasterFonts", () => {
  test("picks Liberation fonts first when they exist", () => {
    const fonts = findRasterFonts((file) => file.includes("/liberation/"));

    expect(fonts.sansFamily).toBe("Liberation Sans");
    expect(fonts.monoFamily).toBe("Liberation Mono");
    expect(fonts.files.every((file) => file.includes("/liberation/"))).toBe(true);
  });

  test("falls back to Arial on macOS paths", () => {
    const fonts = findRasterFonts((file) => file.startsWith("/System/Library/Fonts/"));

    expect(fonts.sansFamily).toBe("Arial");
    expect(fonts.monoFamily).toBe("Courier New");
  });

  test("returns no files when no known font exists, so resvg loads system fonts", () => {
    expect(findRasterFonts(() => false)).toEqual({
      files: [],
      monoFamily: undefined,
      sansFamily: undefined,
    });
  });
});

describe("limitRasterScale", () => {
  test("keeps the scale under the cap", () => {
    expect(limitRasterScale(100, 50, 2, 100 * 50 * 4)).toBe(2);
  });

  test("keeps the scale with no cap", () => {
    expect(limitRasterScale(10_000, 10_000, 2)).toBe(2);
  });

  test("lowers the scale so the raster fits the cap", () => {
    expect(limitRasterScale(1000, 1000, 2, 1000 * 1000)).toBe(1);
  });
});

describe("rasterizeSvg", () => {
  test("reports the SVG CSS size beside the PNG size", () => {
    const raster = rasterizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="10"/>',
      { fonts: { files: [] }, scale: 2 }
    );

    expect(raster).toMatchObject({ height: 20, svgHeight: 10, svgWidth: 30, width: 60 });
  });
});
