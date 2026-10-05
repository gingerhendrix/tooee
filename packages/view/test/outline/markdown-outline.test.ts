import { describe, expect, test } from "bun:test";

import { flattenMarkdown } from "@tooee/renderers";

import { markdownOutline, outlineIndexAt } from "../../src/outline/markdown-outline.js";
import { outlineLabel } from "../../src/outline/outline-panel.js";
import { outlineWidth } from "../../src/outline/use-outline.js";

const outline = (markdown: string) => markdownOutline(flattenMarkdown(markdown));

describe("markdownOutline", () => {
  test("lists headings in order with their block rows and depth", () => {
    // 0 # A | 1 p | 2 ## B | 3 p | 4 ### C | 5 p | 6 # D
    const markdown = ["# A", "a", "## B", "b", "### C", "c", "# D"].join("\n\n");
    expect(outline(markdown)).toEqual([
      { depth: 1, level: 0, row: 0, text: "A" },
      { depth: 2, level: 1, row: 2, text: "B" },
      { depth: 3, level: 2, row: 4, text: "C" },
      { depth: 1, level: 0, row: 6, text: "D" },
    ]);
  });

  test("levels start at the shallowest heading", () => {
    expect(outline("## B\n\n### C\n\n## D").map((entry) => entry.level)).toEqual([0, 1, 0]);
  });

  test("heading text drops inline Markdown", () => {
    const [entry] = outline("## Use `g o` to **open** [the outline](https://example.com)");
    expect(entry?.text).toBe("Use g o to open the outline");
  });

  test("a document with no headings has an empty outline", () => {
    expect(outline("just a paragraph\n\n- a list")).toEqual([]);
  });
});

describe("outlineIndexAt", () => {
  const entries = outline(["# A", "a", "## B", "b", "# C"].join("\n\n"));

  test("finds the last heading at or before a row", () => {
    expect(outlineIndexAt(entries, 0)).toBe(0);
    expect(outlineIndexAt(entries, 1)).toBe(0);
    expect(outlineIndexAt(entries, 3)).toBe(1);
    expect(outlineIndexAt(entries, 4)).toBe(2);
  });

  test("returns -1 before the first heading or with no headings", () => {
    expect(outlineIndexAt(outline("intro\n\n# A"), 0)).toBe(-1);
    expect(outlineIndexAt([], 3)).toBe(-1);
  });
});

describe("outlineWidth", () => {
  test("is 32 columns on a wide terminal and at most 40% of a smaller one", () => {
    expect(outlineWidth(120)).toBe(32);
    expect(outlineWidth(70)).toBe(28);
  });

  test("is 0 below 60 columns", () => {
    expect(outlineWidth(59)).toBe(0);
    expect(outlineWidth(60)).toBe(24);
  });
});

describe("outlineLabel", () => {
  const entry = { depth: 2, level: 1, row: 3, text: "Install" };

  test("indents by level and marks the current heading", () => {
    expect(outlineLabel(entry, false, false, 20)).toBe("    Install");
    expect(outlineLabel(entry, true, false, 20)).toBe("  ▸ Install");
  });

  test("adds a marker for a closed fold and cuts long text", () => {
    expect(outlineLabel(entry, false, true, 20)).toBe("    Install ⋯");
    expect(outlineLabel({ ...entry, text: "A very long heading" }, false, true, 14)).toBe(
      "    A very … ⋯"
    );
  });
});
