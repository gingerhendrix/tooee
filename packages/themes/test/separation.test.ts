import { describe, expect, test } from "bun:test";

import { deltaEOK, lightnessSide, separateFrom, separateSurfaces } from "../src/separation.js";

const MIN = 0.05;

describe("deltaEOK", () => {
  test("is zero for equal colours and one from black to white", () => {
    expect(deltaEOK("#1e2030", "#1e2030")).toBe(0);
    expect(deltaEOK("#000000", "#ffffff")).toBeCloseTo(1, 3);
  });

  test("returns null for translucent or unparsable colours", () => {
    expect(deltaEOK("#00000000", "#000000")).toBeNull();
    expect(deltaEOK("#ff800038", "#000000")).toBeNull();
    expect(deltaEOK("nope", "#000000")).toBeNull();
  });
});

describe("lightnessSide", () => {
  test("reports lighter, darker, or no side", () => {
    expect(lightnessSide("#222436", "#1e2030")).toBe(1);
    expect(lightnessSide("#1e2030", "#222436")).toBe(-1);
    expect(lightnessSide("#101010", "#101010")).toBeNull();
    expect(lightnessSide("#00000000", "#101010")).toBeNull();
  });
});

describe("separateFrom", () => {
  test("keeps a highlight that is already far enough away", () => {
    expect(separateFrom("#3b4261", "#1a1b26", MIN)).toBe("#3b4261");
  });

  test("lifts a highlight equal to a dark base", () => {
    const moved = separateFrom("#101010", "#101010", MIN);

    expect(deltaEOK(moved, "#101010")).toBeGreaterThanOrEqual(MIN);
    expect(lightnessSide(moved, "#101010")).toBe(1);
  });

  test("darkens a highlight equal to a light base", () => {
    const moved = separateFrom("#ffffff", "#ffffff", MIN);

    expect(deltaEOK(moved, "#ffffff")).toBeGreaterThanOrEqual(MIN);
    expect(lightnessSide(moved, "#ffffff")).toBe(-1);
  });

  test("keeps the side a highlight is already on", () => {
    const moved = separateFrom("#1a1b26", "#1e2030", MIN);

    expect(deltaEOK(moved, "#1e2030")).toBeGreaterThanOrEqual(MIN);
    expect(lightnessSide(moved, "#1e2030")).toBe(-1);
  });

  test("uses the preferred side when given", () => {
    const moved = separateFrom("#1a1b26", "#1e2030", MIN, 1);

    expect(lightnessSide(moved, "#1e2030")).toBe(1);
  });

  test("tries the other side when the preferred side runs out of gamut", () => {
    const moved = separateFrom("#ffffff", "#ffffff", MIN, 1);

    expect(deltaEOK(moved, "#ffffff")).toBeGreaterThanOrEqual(MIN);
    expect(lightnessSide(moved, "#ffffff")).toBe(-1);
  });

  test("changes lightness only, so the hue stays close", () => {
    const moved = separateFrom("#222436", "#1e2030", MIN);
    const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(moved.slice(start, start + 2), 16));

    // tokyonight's element is blue-violet: blue stays the strongest channel.
    expect(b).toBeGreaterThan(r ?? 0);
    expect(b).toBeGreaterThan(g ?? 0);
  });

  test("returns translucent colours unchanged", () => {
    expect(separateFrom("#ff800038", "#000000", MIN)).toBe("#ff800038");
    expect(separateFrom("#000000", "#00000000", MIN)).toBe("#000000");
  });
});

describe("separateSurfaces", () => {
  test("keeps an element on the panel's side of the page after the panel moves", () => {
    // tokyonight dark: panel and element step up from the page by less than the floor.
    const result = separateSurfaces(
      { background: "#1a1b26", backgroundElement: "#222436", backgroundPanel: "#1e2030" },
      MIN
    );

    expect(deltaEOK(result.backgroundPanel, result.background)).toBeGreaterThanOrEqual(MIN);
    expect(deltaEOK(result.backgroundElement, result.backgroundPanel)).toBeGreaterThanOrEqual(MIN);
    expect(lightnessSide(result.backgroundElement, result.backgroundPanel)).toBe(1);
  });

  test("separates three identical surfaces", () => {
    const result = separateSurfaces(
      { background: "#101010", backgroundElement: "#101010", backgroundPanel: "#101010" },
      MIN
    );

    expect(lightnessSide(result.backgroundPanel, result.background)).toBe(1);
    expect(lightnessSide(result.backgroundElement, result.backgroundPanel)).toBe(1);
  });
});
