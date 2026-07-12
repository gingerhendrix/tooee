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

function lines(source: string, sourceId?: string): LineShape[] {
  return sourceLines(source, sourceId ? { sourceId } : undefined).map((row) => {
    const p = row.source.primary;
    return {
      text: row.text,
      s: p.start.offset,
      e: p.end.offset,
      sl: p.start.line,
      last: p.lastLine,
      line: p.lineText,
    };
  });
}

describe("sourceLines identity mapping", () => {
  test("an empty source has a single empty row", () => {
    expect(lines("")).toEqual([{ text: "", s: 0, e: 0, sl: 0, last: 0, line: "" }]);
  });

  test("a single line with no newline", () => {
    expect(lines("abc")).toEqual([{ text: "abc", s: 0, e: 3, sl: 0, last: 0, line: "abc" }]);
  });

  test("a trailing newline produces a final empty row", () => {
    expect(lines("a\n")).toEqual([
      { text: "a", s: 0, e: 1, sl: 0, last: 0, line: "a" },
      { text: "", s: 2, e: 2, sl: 1, last: 1, line: "" },
    ]);
  });

  test("multiple blank lines each get their own row", () => {
    expect(lines("x\n\n\ny")).toEqual([
      { text: "x", s: 0, e: 1, sl: 0, last: 0, line: "x" },
      { text: "", s: 2, e: 2, sl: 1, last: 1, line: "" },
      { text: "", s: 3, e: 3, sl: 2, last: 2, line: "" },
      { text: "y", s: 4, e: 5, sl: 3, last: 3, line: "y" },
    ]);
  });

  test("CRLF is one line break; offsets address the original \\r\\n string", () => {
    expect(lines("a\r\nb")).toEqual([
      { text: "a", s: 0, e: 1, sl: 0, last: 0, line: "a" },
      { text: "b", s: 3, e: 4, sl: 1, last: 1, line: "b" },
    ]);
  });

  test("Unicode offsets are UTF-16 code units", () => {
    // é (U+00E9) and ☕ (U+2615) are each one code unit.
    expect(lines("é\n☕")).toEqual([
      { text: "é", s: 0, e: 1, sl: 0, last: 0, line: "é" },
      { text: "☕", s: 2, e: 3, sl: 1, last: 1, line: "☕" },
    ]);
    // 😀 (U+1F600) is a surrogate pair: two code units.
    const astral = lines("😀x");
    expect(astral).toEqual([{ text: "😀x", s: 0, e: 3, sl: 0, last: 0, line: "😀x" }]);
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
