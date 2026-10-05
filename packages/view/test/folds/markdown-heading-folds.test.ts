import { describe, expect, test } from "bun:test";

import { flattenMarkdown } from "@tooee/renderers";

import { markdownHeadingFoldRanges } from "../../src/folds/markdown-heading-folds.js";

const ranges = (markdown: string) =>
  markdownHeadingFoldRanges(flattenMarkdown(markdown)).map(({ key, start, end }) => ({
    end,
    key,
    start,
  }));

describe("markdownHeadingFoldRanges", () => {
  test("folds each heading up to the next heading of equal or higher level", () => {
    // 0 # A | 1 p | 2 ## B | 3 p | 4 ### C | 5 p | 6 ## D | 7 p | 8 # E | 9 p
    const markdown = ["# A", "a", "## B", "b", "### C", "c", "## D", "d", "# E", "e"].join("\n\n");
    expect(ranges(markdown)).toEqual([
      { end: 7, key: 0, start: 0 },
      { end: 5, key: 2, start: 2 },
      { end: 5, key: 4, start: 4 },
      { end: 7, key: 6, start: 6 },
      { end: 9, key: 8, start: 8 },
    ]);
  });

  test("a deeper heading before a shallower one still closes at the shallower heading", () => {
    // 0 ### Deep | 1 p | 2 # Top | 3 p
    expect(ranges("### Deep\n\ndeep\n\n# Top\n\ntop")).toEqual([
      { end: 1, key: 0, start: 0 },
      { end: 3, key: 2, start: 2 },
    ]);
  });

  test("skips headings with no body and documents with no headings", () => {
    expect(ranges("# A\n\n# B\n\nbody")).toEqual([{ end: 2, key: 1, start: 1 }]);
    expect(ranges("just a paragraph\n\n- a list")).toEqual([]);
  });

  test("list items and code blocks fold under their heading", () => {
    // 0 ## H | 1 bullet | 2 bullet | 3 code
    expect(ranges("## H\n\n- one\n- two\n\n```ts\nx\n```")).toEqual([{ end: 3, key: 0, start: 0 }]);
  });
});
