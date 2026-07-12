import { test, expect, describe } from "bun:test";
import { sourceLines, sourceLineAdapter } from "../src/source.js";

interface LineShape {
  text: string;
  s: number;
  e: number;
  sl: number;
  last: number;
  line: string;
}

const lines = function lines(source: string, sourceId?: string): LineShape[] {
  return sourceLines(source, (sourceId?.length ?? 0) > 0 ? { sourceId } : undefined).map((row) => {
    const p = row.source.primary;
    return {
      e: p.end.offset,
      last: p.lastLine,
      line: p.lineText,
      s: p.start.offset,
      sl: p.start.line,
      text: row.text,
    };
  });
};

describe("sourceLines identity mapping", () => {
  test("an empty source has a single empty row", () => {
    expect(lines("")).toEqual([{ e: 0, last: 0, line: "", s: 0, sl: 0, text: "" }]);
  });

  test("a single line with no newline", () => {
    expect(lines("abc")).toEqual([{ e: 3, last: 0, line: "abc", s: 0, sl: 0, text: "abc" }]);
  });

  test("a trailing newline produces a final empty row", () => {
    expect(lines("a\n")).toEqual([
      { e: 1, last: 0, line: "a", s: 0, sl: 0, text: "a" },
      { e: 2, last: 1, line: "", s: 2, sl: 1, text: "" },
    ]);
  });

  test("multiple blank lines each get their own row", () => {
    expect(lines("x\n\n\ny")).toEqual([
      { e: 1, last: 0, line: "x", s: 0, sl: 0, text: "x" },
      { e: 2, last: 1, line: "", s: 2, sl: 1, text: "" },
      { e: 3, last: 2, line: "", s: 3, sl: 2, text: "" },
      { e: 5, last: 3, line: "y", s: 4, sl: 3, text: "y" },
    ]);
  });

  test("CRLF is one line break; offsets address the original \\r\\n string", () => {
    expect(lines("a\r\nb")).toEqual([
      { e: 1, last: 0, line: "a", s: 0, sl: 0, text: "a" },
      { e: 4, last: 1, line: "b", s: 3, sl: 1, text: "b" },
    ]);
  });

  test("Unicode offsets are UTF-16 code units", () => {
    // é (U+00E9) and ☕ (U+2615) are each one code unit.
    expect(lines("é\n☕")).toEqual([
      { e: 1, last: 0, line: "é", s: 0, sl: 0, text: "é" },
      { e: 3, last: 1, line: "☕", s: 2, sl: 1, text: "☕" },
    ]);
    // 😀 (U+1F600) is a surrogate pair: two code units.
    const astral = lines("😀x");
    expect(astral).toEqual([{ e: 3, last: 0, line: "😀x", s: 0, sl: 0, text: "😀x" }]);
  });

  test("row count matches split(\\n) so it agrees with per-line rendering", () => {
    for (const source of ["", "one", "a\nb\nc", "a\n", "\n\n", "a\r\nb\r\nc"]) {
      expect(sourceLines(source)).toHaveLength(source.split("\n").length);
    }
  });

  test("sourceId is carried onto every line span", () => {
    for (const row of sourceLines("a\nb", { sourceId: "file.ts" })) {
      expect(row.source.primary.sourceId).toBe("file.ts");
    }
  });

  test("sourceLineAdapter projects text and source", () => {
    const [row] = sourceLines("hello");
    expect(sourceLineAdapter.getText(row!)).toBe("hello");
    expect(sourceLineAdapter.getSource(row!)).toBe(row!.source);
  });
});
