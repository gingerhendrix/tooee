import { test, expect, describe } from "bun:test";
import { flattenMarkdown, getFlatBlockText } from "../src/markdown-blocks.js";
import type { FlatBlock } from "../src/markdown-blocks.js";

/** Compact per-row projection: order, kind, bullet/checkbox, semantic text, and exact source. */
interface RowShape {
  type: string;
  bullet?: string;
  checked?: boolean;
  text: string;
  source: {
    s: number;
    sl: number;
    sc: number;
    e: number;
    el: number;
    ec: number;
    last: number;
    t: string;
    line: string;
  } | null;
}

function shape(block: FlatBlock): RowShape {
  const p = block.source?.primary;
  const row: RowShape = {
    type: block.token.type,
    text: getFlatBlockText(block),
    source: p
      ? {
          s: p.start.offset,
          sl: p.start.line,
          sc: p.start.column,
          e: p.end.offset,
          el: p.end.line,
          ec: p.end.column,
          last: p.lastLine,
          t: p.text,
          line: p.lineText,
        }
      : null,
  };
  if (block.bullet !== undefined) {
    row.bullet = block.bullet;
  }
  if (block.checked !== undefined) {
    row.checked = block.checked;
  }
  return row;
}

function rows(markdown: string, options?: { sourceId?: string }): RowShape[] {
  return flattenMarkdown(markdown, options).map(shape);
}

describe("flattenMarkdown row order and provenance", () => {
  test("headings separated by blank lines", () => {
    expect(rows("# Title\n\n## Sub\n\nBody text.")).toEqual([
      {
        type: "heading",
        text: "# Title\n\n",
        source: { s: 0, sl: 0, sc: 0, e: 7, el: 0, ec: 7, last: 0, t: "# Title", line: "# Title" },
      },
      {
        type: "heading",
        text: "## Sub\n\n",
        source: { s: 9, sl: 2, sc: 0, e: 15, el: 2, ec: 6, last: 2, t: "## Sub", line: "## Sub" },
      },
      {
        type: "paragraph",
        text: "Body text.",
        source: {
          s: 17,
          sl: 4,
          sc: 0,
          e: 27,
          el: 4,
          ec: 10,
          last: 4,
          t: "Body text.",
          line: "Body text.",
        },
      },
    ]);
  });

  test("repeated identical paragraphs resolve to distinct occurrences", () => {
    const result = rows("Same line\n\nSame line");
    expect(result[0]!.source!.s).toBe(0);
    expect(result[1]!.source!.s).toBe(11);
    expect(result[1]!.source!.sl).toBe(2);
    expect(result[0]!.source!.t).toBe("Same line");
    expect(result[1]!.source!.t).toBe("Same line");
  });

  test("multi-line paragraph spans all its physical lines", () => {
    expect(rows("line one\nline two\nline three")).toEqual([
      {
        type: "paragraph",
        text: "line one\nline two\nline three",
        source: {
          s: 0,
          sl: 0,
          sc: 0,
          e: 28,
          el: 2,
          ec: 10,
          last: 2,
          t: "line one\nline two\nline three",
          line: "line one\nline two\nline three",
        },
      },
    ]);
  });

  test("unordered list items", () => {
    expect(rows("- alpha\n- beta\n- gamma")).toEqual([
      {
        type: "text",
        bullet: "- ",
        text: "alpha",
        source: { s: 2, sl: 0, sc: 2, e: 7, el: 0, ec: 7, last: 0, t: "alpha", line: "- alpha" },
      },
      {
        type: "text",
        bullet: "- ",
        text: "beta",
        source: { s: 10, sl: 1, sc: 2, e: 14, el: 1, ec: 6, last: 1, t: "beta", line: "- beta" },
      },
      {
        type: "text",
        bullet: "- ",
        text: "gamma",
        source: { s: 17, sl: 2, sc: 2, e: 22, el: 2, ec: 7, last: 2, t: "gamma", line: "- gamma" },
      },
    ]);
  });

  test("ordered list items carry their ordinal bullet", () => {
    expect(rows("1. one\n2. two")).toEqual([
      {
        type: "text",
        bullet: "1. ",
        text: "one",
        source: { s: 3, sl: 0, sc: 3, e: 6, el: 0, ec: 6, last: 0, t: "one", line: "1. one" },
      },
      {
        type: "text",
        bullet: "2. ",
        text: "two",
        source: { s: 10, sl: 1, sc: 3, e: 13, el: 1, ec: 6, last: 1, t: "two", line: "2. two" },
      },
    ]);
  });

  test("check list items report checkbox state and full-line source", () => {
    expect(rows("- [x] done\n- [ ] todo")).toEqual([
      {
        type: "text",
        bullet: "- ",
        checked: true,
        text: "done",
        source: {
          s: 6,
          sl: 0,
          sc: 6,
          e: 10,
          el: 0,
          ec: 10,
          last: 0,
          t: "done",
          line: "- [x] done",
        },
      },
      {
        type: "text",
        bullet: "- ",
        checked: false,
        text: "todo",
        source: {
          s: 17,
          sl: 1,
          sc: 6,
          e: 21,
          el: 1,
          ec: 10,
          last: 1,
          t: "todo",
          line: "- [ ] todo",
        },
      },
    ]);
  });

  test("nested lists resolve child text within the enclosing item", () => {
    expect(rows("- parent\n  - child a\n  - child b")).toEqual([
      {
        type: "text",
        bullet: "- ",
        text: "parent\n",
        source: { s: 2, sl: 0, sc: 2, e: 8, el: 0, ec: 8, last: 0, t: "parent", line: "- parent" },
      },
      {
        type: "text",
        bullet: "- ",
        text: "child a",
        source: {
          s: 13,
          sl: 1,
          sc: 4,
          e: 20,
          el: 1,
          ec: 11,
          last: 1,
          t: "child a",
          line: "  - child a",
        },
      },
      {
        type: "text",
        bullet: "- ",
        text: "child b",
        source: {
          s: 25,
          sl: 2,
          sc: 4,
          e: 32,
          el: 2,
          ec: 11,
          last: 2,
          t: "child b",
          line: "  - child b",
        },
      },
    ]);
  });

  test("a list-item that opens with a nested list emits a synthetic bullet marker", () => {
    // marked shape: item "2." has [space, list] children — the bullet row is
    // synthetic and maps to the "2." marker, not the child cursor.
    const result = rows("1. first\n2.\n   - nested");
    expect(result).toEqual([
      {
        type: "text",
        bullet: "1. ",
        text: "first",
        source: { s: 3, sl: 0, sc: 3, e: 8, el: 0, ec: 8, last: 0, t: "first", line: "1. first" },
      },
      {
        type: "text",
        bullet: "2. ",
        text: "2. ", // synthetic: visible bullet text, non-empty for search/copy
        source: { s: 9, sl: 1, sc: 0, e: 11, el: 1, ec: 2, last: 1, t: "2.", line: "2." },
      },
      {
        type: "text",
        bullet: "- ",
        text: "nested",
        source: {
          s: 17,
          sl: 2,
          sc: 5,
          e: 23,
          el: 2,
          ec: 11,
          last: 2,
          t: "nested",
          line: "   - nested",
        },
      },
    ]);
    // The synthetic row's search/copy text is never empty.
    expect(result[1]!.text.length).toBeGreaterThan(0);
  });

  test("fenced code with internal blank lines keeps its exact span", () => {
    expect(rows("```js\na\n\nb\n```")).toEqual([
      {
        type: "code",
        text: "```js\na\n\nb\n```",
        source: {
          s: 0,
          sl: 0,
          sc: 0,
          e: 14,
          el: 4,
          ec: 3,
          last: 4,
          t: "```js\na\n\nb\n```",
          line: "```js\na\n\nb\n```",
        },
      },
    ]);
  });

  test("repeated identical fenced code advances past the first fence", () => {
    const md = "```\nx\n```\n\n```\nx\n```";
    const result = rows(md);
    expect(result).toHaveLength(2);
    expect(result[0]!.source!.s).toBe(0);
    expect(result[0]!.source!.e).toBe(9);
    // The second fence resolves to its own occurrence, not back to the first.
    expect(result[1]!.source!.s).toBe(11);
    expect(result[1]!.source!.s).toBeGreaterThan(result[0]!.source!.e);
  });

  test("blockquotes, nested blockquotes, thematic rules, HTML and tables", () => {
    expect(rows("> outer\n> > inner")).toEqual([
      {
        type: "blockquote",
        text: "> outer\n> > inner",
        source: {
          s: 0,
          sl: 0,
          sc: 0,
          e: 17,
          el: 1,
          ec: 9,
          last: 1,
          t: "> outer\n> > inner",
          line: "> outer\n> > inner",
        },
      },
    ]);

    expect(rows("---\n\n<div>x</div>")).toEqual([
      {
        type: "hr",
        text: "---",
        source: { s: 0, sl: 0, sc: 0, e: 3, el: 0, ec: 3, last: 0, t: "---", line: "---" },
      },
      {
        type: "html",
        text: "<div>x</div>",
        source: {
          s: 5,
          sl: 2,
          sc: 0,
          e: 17,
          el: 2,
          ec: 12,
          last: 2,
          t: "<div>x</div>",
          line: "<div>x</div>",
        },
      },
    ]);

    expect(rows("| A | B |\n| --- | --- |\n| 1 | 2 |")).toEqual([
      {
        type: "table",
        text: "| A | B |\n| --- | --- |\n| 1 | 2 |",
        source: {
          s: 0,
          sl: 0,
          sc: 0,
          e: 33,
          el: 2,
          ec: 9,
          last: 2,
          t: "| A | B |\n| --- | --- |\n| 1 | 2 |",
          line: "| A | B |\n| --- | --- |\n| 1 | 2 |",
        },
      },
    ]);
  });

  describe("LF vs CRLF equivalence", () => {
    const cases: Array<[string, string]> = [
      ["no terminal newline", "para one\n\npara two"],
      ["terminal newline", "para one\n\npara two\n"],
    ];
    for (const [label, lf] of cases) {
      test(label, () => {
        const crlf = lf.replace(/\n/gu, "\r\n");
        const lfRows = rows(lf);
        const crlfRows = rows(crlf);

        // Row order and semantic text agree; CRLF offsets address the \r\n string.
        expect(lfRows.map((r) => r.text)).toEqual(crlfRows.map((r) => r.text));
        expect(lfRows.map((r) => r.source!.sl)).toEqual(crlfRows.map((r) => r.source!.sl));
        expect(lfRows.map((r) => r.source!.t)).toEqual(crlfRows.map((r) => r.source!.t));
        expect(lfRows.map((r) => r.source!.line)).toEqual(crlfRows.map((r) => r.source!.line));

        // The second paragraph starts later under CRLF (extra \r per break).
        expect(crlfRows[1]!.source!.s).toBeGreaterThan(lfRows[1]!.source!.s);
        // lineText excludes the \r\n delimiter.
        expect(crlfRows[0]!.source!.line).toBe("para one");
      });
    }

    test("multi-line CRLF blocks resolve with original \\r\\n offsets", () => {
      // marked normalizes \r\n to \n inside multi-line raw; the resolver still
      // finds the block in the CRLF source and keeps the original characters.
      const result = rows("line one\r\nline two\r\n\r\n> quote a\r\n> quote b");
      expect(result[0]).toMatchObject({ type: "paragraph" });
      expect(result[0]!.source).toEqual({
        s: 0,
        sl: 0,
        sc: 0,
        e: 18,
        el: 1,
        ec: 8,
        last: 1,
        t: "line one\r\nline two",
        line: "line one\r\nline two",
      });
      expect(result[1]!.type).toBe("blockquote");
      expect(result[1]!.source!.t).toBe("> quote a\r\n> quote b");
    });
  });

  test("Unicode offsets are UTF-16 code units (astral chars advance by two)", () => {
    // 😀 (U+1F600) is a surrogate pair: two UTF-16 code units.
    const result = rows("😀 hi\n\nbye");
    expect(result[0]!.source!.t).toBe("😀 hi");
    // "😀 hi" = 2 (emoji) + 1 (space) + 2 (hi) = 5 code units.
    expect(result[0]!.source!.e).toBe(5);
    // "bye" starts after "😀 hi\n\n" = 5 + 2 = 7.
    expect(result[1]!.source!.s).toBe(7);
    expect(result[1]!.source!.t).toBe("bye");

    // BMP characters count as a single code unit.
    const bmp = rows("café ☕\n\n日本語");
    expect(bmp[0]!.source!.e).toBe(6);
    expect(bmp[1]!.source!.s).toBe(8);
  });

  test("an unresolvable token (marked de-indents child block raw) returns source:null", () => {
    // The fenced code inside the list item is de-indented in its token.raw, so
    // no exact slice exists in the source: the algorithm returns null rather
    // than backtracking to a wrong location.
    const result = rows("- Setup:\n\n  ```bash\n  npm install\n  ```\n\n- Next");
    expect(result[0]).toMatchObject({ type: "paragraph", bullet: "- ", text: "Setup:" });
    expect(result[1]!.type).toBe("code");
    expect(result[1]!.source).toBeNull();
    expect(result[2]).toMatchObject({ type: "paragraph", bullet: "- ", text: "Next" });
    // Later rows still resolve — a null does not poison the monotonic cursor.
    expect(result[2]!.source!.t).toBe("Next");
  });

  test("sourceId is stamped onto every resolved span when supplied", () => {
    const result = flattenMarkdown("# H\n\npara", { sourceId: "doc.md" });
    expect(result[0]!.source!.primary.sourceId).toBe("doc.md");
    expect(result[1]!.source!.primary.sourceId).toBe("doc.md");
  });
});

describe("getFlatBlockText", () => {
  test("uses token raw for content rows and visible bullet text for synthetic rows", () => {
    const synthetic = flattenMarkdown("1. first\n2.\n   - nested").find(
      (b) => (b.token as { raw?: string }).raw === "",
    );
    // For a bullet-only synthetic row, text falls back to the visible bullet.
    expect(synthetic).toBeDefined();
    expect(getFlatBlockText(synthetic!).length).toBeGreaterThan(0);
  });
});
