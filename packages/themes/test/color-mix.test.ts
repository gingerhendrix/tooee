import { describe, expect, test } from "bun:test";

import { mixColors } from "../src/color-mix.js";

describe("mixColors", () => {
  test("returns the base at 0 and the tint at 1", () => {
    expect(mixColors("#102030", "#f0e0d0", 0)).toBe("#102030");
    expect(mixColors("#102030", "#f0e0d0", 1)).toBe("#f0e0d0");
  });

  test("blends each channel and rounds", () => {
    expect(mixColors("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  test("expands shorthand hex", () => {
    expect(mixColors("#000", "#fff", 0.5)).toBe("#808080");
    expect(mixColors("#0000", "#f00", 0.5)).toBe("#ff000080");
  });

  test("gives an opaque result over an opaque 8-digit base", () => {
    expect(mixColors("#000000ff", "#ffffff", 0.25)).toBe("#404040");
  });

  test("gives the tint at partial opacity over a transparent base", () => {
    expect(mixColors("#00000000", "#ff8000", 0.25)).toBe("#ff800040");
  });

  test("returns the tint when a colour cannot be parsed", () => {
    expect(mixColors("not-a-colour", "#ff8000", 0.5)).toBe("#ff8000");
    expect(mixColors("#000000", "nope", 0.5)).toBe("nope");
  });
});
