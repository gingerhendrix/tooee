import { describe, expect, test } from "bun:test";

import { cellWidth, truncateCells } from "../src/cell-text.js";

describe("truncateCells", () => {
  test("keeps text that fits", () => {
    expect(truncateCells("abc", 5)).toBe("abc");
  });

  test("end", () => {
    expect(truncateCells("abcdefgh", 5, "end")).toBe("abcd…");
  });

  test("start", () => {
    expect(truncateCells("abcdefgh", 5, "start")).toBe("…efgh");
  });

  test("middle", () => {
    expect(truncateCells("abcdefgh", 5, "middle")).toBe("ab…gh");
  });

  test("gives an ellipsis at one cell and nothing at zero", () => {
    expect(truncateCells("abcdefgh", 1)).toBe("…");
    expect(truncateCells("abcdefgh", 0)).toBe("");
  });

  test("a wide character never splits", () => {
    for (const mode of ["end", "middle", "start"] as const) {
      for (let max = 2; max <= 10; max += 1) {
        const out = truncateCells("日本語のテキスト", max, mode);
        expect(cellWidth(out)).toBeLessThanOrEqual(max);
        expect(out).toContain("…");
      }
    }
  });

  test("an emoji grapheme stays whole", () => {
    expect(truncateCells("ab👩‍💻cd", 5, "end")).toBe("ab👩‍💻…");
  });
});
