import { expect, test } from "bun:test";

import { loadThemes, MIN_SURFACE_SEPARATION, resolveTheme } from "@tooee/themes";

import { deltaEOK } from "../src/separation.js";

const SEARCH_KEYS = [
  "searchMatchBg",
  "searchCurrentMatchBg",
  "searchMatchFg",
  "searchCurrentMatchFg",
] as const;

// Matched rows keep the theme text readable: WCAG contrast of at least 2.5:1.
const MIN_SEARCH_TEXT_CONTRAST = 2.5;

// [highlight, base]: each highlight surface must stand out from the surface it sits on.
const SURFACE_PAIRS = [
  ["backgroundPanel", "background"],
  ["backgroundElement", "backgroundPanel"],
  ["selection", "background"],
  ["selection", "backgroundPanel"],
  ["cursorLine", "background"],
] as const;

// Overlays and active rows need opaque surfaces so they cover the content behind them.
const OPAQUE_SURFACES = ["backgroundPanel", "backgroundElement"] as const;

const luminance = function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;

    // The sRGB threshold (0.04045) and 0.04 split 8-bit channels the same way.
    return value <= 0.04 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);

  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

const OPAQUE_LONG_HEX = /^#[0-9a-fA-F]{6}$/u;

// OpenTUI's hexToRgb accepts 3/4-digit shorthand as well as 6/8-digit hex
const HEX = /^#(?<hex>[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;

for (const [name, json] of loadThemes()) {
  test(`bundled theme "${name}" defines every search token`, () => {
    for (const key of SEARCH_KEYS) {
      expect(json.theme[key], `${name}.${key}`).toBeDefined();
    }
  });

  for (const mode of ["dark", "light"] as const) {
    test(`bundled theme "${name}" resolves in ${mode} mode`, () => {
      const resolved = resolveTheme(json, mode);

      for (const [key, value] of Object.entries(resolved)) {
        expect(value, `${name}.${key} (${mode})`).toMatch(HEX);
      }
    });

    test(`bundled theme "${name}" separates highlight surfaces in ${mode} mode`, () => {
      const resolved = resolveTheme(json, mode);

      for (const key of OPAQUE_SURFACES) {
        expect(resolved[key], `${name}.${key} (${mode})`).toMatch(OPAQUE_LONG_HEX);
      }

      for (const [highlight, base] of SURFACE_PAIRS) {
        const distance = deltaEOK(resolved[highlight], resolved[base]);

        // Translucent pairs blend over the terminal background, which is unknown here.
        if (distance !== null) {
          expect(distance, `${name} ${highlight}/${base} (${mode})`).toBeGreaterThanOrEqual(
            MIN_SURFACE_SEPARATION
          );
        }
      }
    });

    test(`bundled theme "${name}" keeps text readable on row highlights in ${mode} mode`, () => {
      const resolved = resolveTheme(json, mode);

      for (const background of [resolved.selection, resolved.cursorLine]) {
        if (OPAQUE_LONG_HEX.test(background) && OPAQUE_LONG_HEX.test(resolved.text)) {
          expect(contrast(resolved.text, background)).toBeGreaterThanOrEqual(
            MIN_SEARCH_TEXT_CONTRAST
          );
        }
      }
    });

    test(`bundled theme "${name}" keeps text readable on search highlights in ${mode} mode`, () => {
      const resolved = resolveTheme(json, mode);
      const backgrounds = [resolved.searchMatchBg, resolved.searchCurrentMatchBg];

      expect(resolved.searchCurrentMatchBg).not.toBe(resolved.searchMatchBg);

      for (const background of backgrounds) {
        // Translucent highlights blend over the terminal background, which is unknown here.
        if (OPAQUE_LONG_HEX.test(background) && OPAQUE_LONG_HEX.test(resolved.text)) {
          expect(contrast(resolved.text, background)).toBeGreaterThanOrEqual(
            MIN_SEARCH_TEXT_CONTRAST
          );
        }
      }
    });
  }
}
