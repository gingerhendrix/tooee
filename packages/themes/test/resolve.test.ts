import { describe, expect, test } from "bun:test";

import { FALLBACKS, RESOLVED_KEYS, resolveTheme } from "@tooee/themes";
import type { ResolvedTheme, ThemeJSON } from "@tooee/themes";

test("RESOLVED_KEYS covers every ResolvedTheme fallback key", () => {
  const keys: readonly (keyof ResolvedTheme)[] = RESOLVED_KEYS;
  expect(keys).toEqual(Object.keys(FALLBACKS));
});

describe("resolveTheme", () => {
  test("returns the cycle fallback for theme keys that reference each other", () => {
    const json: ThemeJSON = {
      theme: { primary: "secondary", secondary: "primary" },
    };

    const resolved = resolveTheme(json, "dark");
    expect(resolved.primary).toBe("#808080");
    expect(resolved.secondary).toBe("#808080");
  });

  test("returns the cycle fallback for a cycle in defs", () => {
    const json: ThemeJSON = {
      defs: { a: "b", b: "a" },
      theme: { primary: "a" },
    };

    expect(resolveTheme(json, "dark").primary).toBe("#808080");
  });

  test("returns the cycle fallback for a self-referencing key", () => {
    const json: ThemeJSON = {
      theme: { primary: "primary" },
    };

    expect(resolveTheme(json, "dark").primary).toBe("#808080");
  });

  test("resolves a defs reference chain to its hex value", () => {
    const json: ThemeJSON = {
      defs: { brand: "#ff0000" },
      theme: { primary: "brand" },
    };

    expect(resolveTheme(json, "dark").primary).toBe("#ff0000");
  });

  test("allows a def to be referenced from multiple keys without a false cycle", () => {
    const json: ThemeJSON = {
      defs: { base: "#112233", x: "base", y: "base" },
      theme: { primary: "x", secondary: "y" },
    };

    const resolved = resolveTheme(json, "dark");
    expect(resolved.primary).toBe("#112233");
    expect(resolved.secondary).toBe("#112233");
  });

  test("resolves transparent and none to transparent black", () => {
    const json: ThemeJSON = {
      theme: { primary: "transparent", secondary: "none" },
    };

    const resolved = resolveTheme(json, "dark");
    expect(resolved.primary).toBe("#00000000");
    expect(resolved.secondary).toBe("#00000000");
  });

  test("resolves an unknown reference to the gray fallback", () => {
    const json: ThemeJSON = {
      theme: { primary: "doesNotExist" },
    };

    expect(resolveTheme(json, "dark").primary).toBe("#808080");
  });

  test("resolves a { dark, light } variant per mode", () => {
    const json: ThemeJSON = {
      defs: { day: "#eeeeee" },
      theme: { primary: { dark: "#111111", light: "day" } },
    };

    expect(resolveTheme(json, "dark").primary).toBe("#111111");
    expect(resolveTheme(json, "light").primary).toBe("#eeeeee");
  });
});

describe("search tokens", () => {
  const base: ThemeJSON = {
    theme: { background: "#000000", primary: "#0000ff", warning: "#ff8000" },
  };

  test("derive tinted backgrounds and sign colours when the theme omits them", () => {
    const resolved = resolveTheme(base, "dark");

    expect(resolved.searchMatchBg).toBe("#381c00");
    expect(resolved.searchCurrentMatchBg).toBe("#000059");
    expect(resolved.searchMatchFg).toBe("#ff8000");
    expect(resolved.searchCurrentMatchFg).toBe("#0000ff");
  });

  test("use explicit theme values over the derived ones", () => {
    const json: ThemeJSON = {
      theme: {
        ...base.theme,
        searchCurrentMatchBg: "#222222",
        searchCurrentMatchFg: "#444444",
        searchMatchBg: "#111111",
        searchMatchFg: "warning",
      },
    };

    const resolved = resolveTheme(json, "dark");
    expect(resolved.searchMatchBg).toBe("#111111");
    expect(resolved.searchCurrentMatchBg).toBe("#222222");
    expect(resolved.searchMatchFg).toBe("#ff8000");
    expect(resolved.searchCurrentMatchFg).toBe("#444444");
  });

  test("derive translucent backgrounds over a transparent theme background", () => {
    const json: ThemeJSON = { theme: { ...base.theme, background: "transparent" } };

    const resolved = resolveTheme(json, "dark");
    expect(resolved.searchMatchBg).toBe("#ff800038");
    expect(resolved.searchCurrentMatchBg).toBe("#0000ff59");
  });
});
