import { test, expect, describe } from "bun:test";
import { HUNK_DIFF_THEME_NAMES } from "hunkdiff/opentui";
import { loadThemes, resolveTheme } from "@tooee/themes";
import { HUNK_THEME_MAP, isLightBackground, resolveHunkDiffTheme } from "../src/theme-map.js";

const BUNDLED = new Set<string>(HUNK_DIFF_THEME_NAMES);

const colorsFor = function colorsFor(name: string) {
  const json = loadThemes().get(name);
  if (json === undefined) {
    throw new Error(`missing theme fixture: ${name}`);
  }
  return resolveTheme(json, "dark");
};

describe("resolveHunkDiffTheme", () => {
  test("every bundled Tooee theme resolves to a real Hunk theme, in both modes", () => {
    const themes = loadThemes();
    expect(themes.size).toBeGreaterThan(0);
    for (const [name, json] of themes) {
      for (const mode of ["dark", "light"] as const) {
        const resolved = resolveHunkDiffTheme(name, resolveTheme(json, mode));
        expect(BUNDLED.has(resolved)).toBe(true);
      }
    }
    // Every shipped theme is mapped explicitly, not just via the fallback.
    for (const name of themes.keys()) {
      expect(Object.hasOwn(HUNK_THEME_MAP, name)).toBe(true);
    }
  });

  test("every mapped name is a bundled Hunk theme", () => {
    for (const pair of Object.values(HUNK_THEME_MAP)) {
      expect(BUNDLED.has(pair.dark)).toBe(true);
      expect(BUNDLED.has(pair.light)).toBe(true);
    }
  });

  test("unmapped themes fall back to GitHub on the matching side", () => {
    const dark = colorsFor("tokyonight");
    expect(resolveHunkDiffTheme("some-user-theme", { ...dark, background: "#101014" })).toBe(
      "github-dark",
    );
    expect(resolveHunkDiffTheme("some-user-theme", { ...dark, background: "#fdfdfd" })).toBe(
      "github-light",
    );
  });

  test("the resolved background decides between a theme's light and dark palettes", () => {
    const colors = colorsFor("github");
    expect(resolveHunkDiffTheme("github", { ...colors, background: "#0d1117" })).toBe(
      "github-dark",
    );
    expect(resolveHunkDiffTheme("github", { ...colors, background: "#ffffff" })).toBe(
      "github-light",
    );
  });
});

describe("isLightBackground", () => {
  test("classifies hex colours by luma", () => {
    expect(isLightBackground("#ffffff")).toBe(true);
    expect(isLightBackground("#fff")).toBe(true);
    expect(isLightBackground("#000000")).toBe(false);
    expect(isLightBackground("#1e1e2a")).toBe(false);
  });

  test("treats non-hex backgrounds as dark", () => {
    expect(isLightBackground("transparent")).toBe(false);
    expect(isLightBackground("")).toBe(false);
  });
});
