import { test, expect, describe } from "bun:test";
import { flattenMarkdown, getFlatBlockText } from "../src/markdown-blocks.js";
import { expectDefined } from "./support/expect-defined.js";
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

const shape = function shape(block: FlatBlock): RowShape {
  const p = block.source?.primary;
  const row: RowShape = {
    source: p
      ? {
          e: p.end.offset,
          ec: p.end.column,
          el: p.end.line,
          last: p.lastLine,
          line: p.lineText,
          s: p.start.offset,
          sc: p.start.column,
          sl: p.start.line,
          t: p.text,
        }
      : null,
    text: getFlatBlockText(block),
    type: block.token.type,
  };
  if (block.bullet !== undefined) {
    row.bullet = block.bullet;
  }
  if (block.checked !== undefined) {
    row.checked = block.checked;
  }
  return row;
};

const rows = function rows(markdown: string, options?: { sourceId?: string }): RowShape[] {
  return flattenMarkdown(markdown, options).map(shape);
};

describe("flattenMarkdown row order and provenance", () => {
  test("headings separated by blank lines", () => {
    expect(rows("# Title\n\n## Sub\n\nBody text.")).toEqual([
      {
        source: { e: 7, ec: 7, el: 0, last: 0, line: "# Title", s: 0, sc: 0, sl: 0, t: "# Title" },
        text: "# Title\n\n",
        type: "heading",
      },
      {
        source: { e: 15, ec: 6, el: 2, last: 2, line: "## Sub", s: 9, sc: 0, sl: 2, t: "## Sub" },
        text: "## Sub\n\n",
        type: "heading",
      },
      {
        source: {
          e: 27,
          ec: 10,
          el: 4,
          last: 4,
          line: "Body text.",
          s: 17,
          sc: 0,
          sl: 4,
          t: "Body text.",
        },
        text: "Body text.",
        type: "paragraph",
      },
    ]);
  });

  test("repeated identical paragraphs resolve to distinct occurrences", () => {
    const result = rows("Same line\n\nSame line");
    expect(expectDefined(expectDefined(result[0]).source).s).toBe(0);
    expect(expectDefined(expectDefined(result[1]).source).s).toBe(11);
    expect(expectDefined(expectDefined(result[1]).source).sl).toBe(2);
    expect(expectDefined(expectDefined(result[0]).source).t).toBe("Same line");
    expect(expectDefined(expectDefined(result[1]).source).t).toBe("Same line");
  });

  test("multi-line paragraph spans all its physical lines", () => {
    expect(rows("line one\nline two\nline three")).toEqual([
      {
        source: {
          e: 28,
          ec: 10,
          el: 2,
          last: 2,
          line: "line one\nline two\nline three",
          s: 0,
          sc: 0,
          sl: 0,
          t: "line one\nline two\nline three",
        },
        text: "line one\nline two\nline three",
        type: "paragraph",
      },
    ]);
  });

  test("unordered list items", () => {
    expect(rows("- alpha\n- beta\n- gamma")).toEqual([
      {
        bullet: "- ",
        source: { e: 7, ec: 7, el: 0, last: 0, line: "- alpha", s: 2, sc: 2, sl: 0, t: "alpha" },
        text: "alpha",
        type: "text",
      },
      {
        bullet: "- ",
        source: { e: 14, ec: 6, el: 1, last: 1, line: "- beta", s: 10, sc: 2, sl: 1, t: "beta" },
        text: "beta",
        type: "text",
      },
      {
        bullet: "- ",
        source: { e: 22, ec: 7, el: 2, last: 2, line: "- gamma", s: 17, sc: 2, sl: 2, t: "gamma" },
        text: "gamma",
        type: "text",
      },
    ]);
  });

  test("ordered list items carry their ordinal bullet", () => {
    expect(rows("1. one\n2. two")).toEqual([
      {
        bullet: "1. ",
        source: { e: 6, ec: 6, el: 0, last: 0, line: "1. one", s: 3, sc: 3, sl: 0, t: "one" },
        text: "one",
        type: "text",
      },
      {
        bullet: "2. ",
        source: { e: 13, ec: 6, el: 1, last: 1, line: "2. two", s: 10, sc: 3, sl: 1, t: "two" },
        text: "two",
        type: "text",
      },
    ]);
  });

  test("check list items report checkbox state and full-line source", () => {
    expect(rows("- [x] done\n- [ ] todo")).toEqual([
      {
        bullet: "- ",
        checked: true,
        source: {
          e: 10,
          ec: 10,
          el: 0,
          last: 0,
          line: "- [x] done",
          s: 6,
          sc: 6,
          sl: 0,
          t: "done",
        },
        text: "done",
        type: "text",
      },
      {
        bullet: "- ",
        checked: false,
        source: {
          e: 21,
          ec: 10,
          el: 1,
          last: 1,
          line: "- [ ] todo",
          s: 17,
          sc: 6,
          sl: 1,
          t: "todo",
        },
        text: "todo",
        type: "text",
      },
    ]);
  });

  test("nested lists resolve child text within the enclosing item", () => {
    expect(rows("- parent\n  - child a\n  - child b")).toEqual([
      {
        bullet: "- ",
        source: { e: 8, ec: 8, el: 0, last: 0, line: "- parent", s: 2, sc: 2, sl: 0, t: "parent" },
        text: "parent\n",
        type: "text",
      },
      {
        bullet: "- ",
        source: {
          e: 20,
          ec: 11,
          el: 1,
          last: 1,
          line: "  - child a",
          s: 13,
          sc: 4,
          sl: 1,
          t: "child a",
        },
        text: "child a",
        type: "text",
      },
      {
        bullet: "- ",
        source: {
          e: 32,
          ec: 11,
          el: 2,
          last: 2,
          line: "  - child b",
          s: 25,
          sc: 4,
          sl: 2,
          t: "child b",
        },
        text: "child b",
        type: "text",
      },
    ]);
  });

  test("a list-item that opens with a nested list emits a synthetic bullet marker", () => {
    // marked shape: item "2." has [space, list] children — the bullet row is
    // synthetic and maps to the "2." marker, not the child cursor.
    const result = rows("1. first\n2.\n   - nested");
    expect(result).toEqual([
      {
        bullet: "1. ",
        source: { e: 8, ec: 8, el: 0, last: 0, line: "1. first", s: 3, sc: 3, sl: 0, t: "first" },
        text: "first",
        type: "text",
      },
      {
        bullet: "2. ",
        source: { e: 11, ec: 2, el: 1, last: 1, line: "2.", s: 9, sc: 0, sl: 1, t: "2." },
        text: "2. ",
        type: "text",
      },
      {
        bullet: "- ",
        source: {
          e: 23,
          ec: 11,
          el: 2,
          last: 2,
          line: "   - nested",
          s: 17,
          sc: 5,
          sl: 2,
          t: "nested",
        },
        text: "nested",
        type: "text",
      },
    ]);
    // The synthetic row's search/copy text is never empty.
    expect(expectDefined(result[1]).text.length).toBeGreaterThan(0);
  });

  test("fenced code with internal blank lines keeps its exact span", () => {
    expect(rows("```js\na\n\nb\n```")).toEqual([
      {
        source: {
          e: 14,
          ec: 3,
          el: 4,
          last: 4,
          line: "```js\na\n\nb\n```",
          s: 0,
          sc: 0,
          sl: 0,
          t: "```js\na\n\nb\n```",
        },
        text: "```js\na\n\nb\n```",
        type: "code",
      },
    ]);
  });

  test("repeated identical fenced code advances past the first fence", () => {
    const md = "```\nx\n```\n\n```\nx\n```";
    const result = rows(md);
    expect(result).toHaveLength(2);
    expect(expectDefined(expectDefined(result[0]).source).s).toBe(0);
    expect(expectDefined(expectDefined(result[0]).source).e).toBe(9);
    // The second fence resolves to its own occurrence, not back to the first.
    expect(expectDefined(expectDefined(result[1]).source).s).toBe(11);
    expect(expectDefined(expectDefined(result[1]).source).s).toBeGreaterThan(
      expectDefined(expectDefined(result[0]).source).e,
    );
  });

  test("blockquotes, nested blockquotes, thematic rules, HTML and tables", () => {
    expect(rows("> outer\n> > inner")).toEqual([
      {
        source: {
          e: 17,
          ec: 9,
          el: 1,
          last: 1,
          line: "> outer\n> > inner",
          s: 0,
          sc: 0,
          sl: 0,
          t: "> outer\n> > inner",
        },
        text: "> outer\n> > inner",
        type: "blockquote",
      },
    ]);

    expect(rows("---\n\n<div>x</div>")).toEqual([
      {
        source: { e: 3, ec: 3, el: 0, last: 0, line: "---", s: 0, sc: 0, sl: 0, t: "---" },
        text: "---",
        type: "hr",
      },
      {
        source: {
          e: 17,
          ec: 12,
          el: 2,
          last: 2,
          line: "<div>x</div>",
          s: 5,
          sc: 0,
          sl: 2,
          t: "<div>x</div>",
        },
        text: "<div>x</div>",
        type: "html",
      },
    ]);

    expect(rows("| A | B |\n| --- | --- |\n| 1 | 2 |")).toEqual([
      {
        source: {
          e: 33,
          ec: 9,
          el: 2,
          last: 2,
          line: "| A | B |\n| --- | --- |\n| 1 | 2 |",
          s: 0,
          sc: 0,
          sl: 0,
          t: "| A | B |\n| --- | --- |\n| 1 | 2 |",
        },
        text: "| A | B |\n| --- | --- |\n| 1 | 2 |",
        type: "table",
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
        expect(lfRows.map((r) => expectDefined(r.source).sl)).toEqual(
          crlfRows.map((r) => expectDefined(r.source).sl),
        );
        expect(lfRows.map((r) => expectDefined(r.source).t)).toEqual(
          crlfRows.map((r) => expectDefined(r.source).t),
        );
        expect(lfRows.map((r) => expectDefined(r.source).line)).toEqual(
          crlfRows.map((r) => expectDefined(r.source).line),
        );

        // The second paragraph starts later under CRLF (extra \r per break).
        expect(expectDefined(expectDefined(crlfRows[1]).source).s).toBeGreaterThan(
          expectDefined(expectDefined(lfRows[1]).source).s,
        );
        // lineText excludes the \r\n delimiter.
        expect(expectDefined(expectDefined(crlfRows[0]).source).line).toBe("para one");
      });
    }

    test("multi-line CRLF blocks resolve with original \\r\\n offsets", () => {
      // marked normalizes \r\n to \n inside multi-line raw; the resolver still
      // finds the block in the CRLF source and keeps the original characters.
      const result = rows("line one\r\nline two\r\n\r\n> quote a\r\n> quote b");
      expect(result[0]).toMatchObject({ type: "paragraph" });
      expect(expectDefined(result[0]).source).toEqual({
        e: 18,
        ec: 8,
        el: 1,
        last: 1,
        line: "line one\r\nline two",
        s: 0,
        sc: 0,
        sl: 0,
        t: "line one\r\nline two",
      });
      expect(expectDefined(result[1]).type).toBe("blockquote");
      expect(expectDefined(expectDefined(result[1]).source).t).toBe("> quote a\r\n> quote b");
    });
  });

  test("Unicode offsets are UTF-16 code units (astral chars advance by two)", () => {
    // 😀 (U+1F600) is a surrogate pair: two UTF-16 code units.
    const result = rows("😀 hi\n\nbye");
    expect(expectDefined(expectDefined(result[0]).source).t).toBe("😀 hi");
    // "😀 hi" = 2 (emoji) + 1 (space) + 2 (hi) = 5 code units.
    expect(expectDefined(expectDefined(result[0]).source).e).toBe(5);
    // "bye" starts after "😀 hi\n\n" = 5 + 2 = 7.
    expect(expectDefined(expectDefined(result[1]).source).s).toBe(7);
    expect(expectDefined(expectDefined(result[1]).source).t).toBe("bye");

    // BMP characters count as a single code unit.
    const bmp = rows("café ☕\n\n日本語");
    expect(expectDefined(expectDefined(bmp[0]).source).e).toBe(6);
    expect(expectDefined(expectDefined(bmp[1]).source).s).toBe(8);
  });

  test("an unresolvable token (marked de-indents child block raw) returns source:null", () => {
    // The fenced code inside the list item is de-indented in its token.raw, so
    // no exact slice exists in the source: the algorithm returns null rather
    // than backtracking to a wrong location.
    const result = rows("- Setup:\n\n  ```bash\n  npm install\n  ```\n\n- Next");
    expect(result[0]).toMatchObject({ bullet: "- ", text: "Setup:", type: "paragraph" });
    expect(expectDefined(result[1]).type).toBe("code");
    expect(expectDefined(result[1]).source).toBeNull();
    expect(result[2]).toMatchObject({ bullet: "- ", text: "Next", type: "paragraph" });
    // Later rows still resolve — a null does not poison the monotonic cursor.
    expect(expectDefined(expectDefined(result[2]).source).t).toBe("Next");
  });

  test("sourceId is stamped onto every resolved span when supplied", () => {
    const result = flattenMarkdown("# H\n\npara", { sourceId: "doc.md" });
    expect(expectDefined(expectDefined(result[0]).source).primary.sourceId).toBe("doc.md");
    expect(expectDefined(expectDefined(result[1]).source).primary.sourceId).toBe("doc.md");
  });
});

describe("getFlatBlockText", () => {
  test("uses token raw for content rows and visible bullet text for synthetic rows", () => {
    const synthetic = flattenMarkdown("1. first\n2.\n   - nested").find(
      (b) => (b.token as { raw?: string }).raw === "",
    );
    // For a bullet-only synthetic row, text falls back to the visible bullet.
    expect(synthetic).toBeDefined();
    expect(getFlatBlockText(expectDefined(synthetic)).length).toBeGreaterThan(0);
  });
});
