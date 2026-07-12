import { describe, expect, test } from "bun:test";
import { resolveTheme, type ThemeJSON } from "@tooee/themes";

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
