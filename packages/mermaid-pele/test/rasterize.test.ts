import { describe, expect, test } from "bun:test";

import { findRasterFonts } from "../src/rasterize.js";

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
