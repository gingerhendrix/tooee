import { test, expect, describe } from "bun:test";
import { buildDiffModel, diffRowAdapter, scanPatchSections } from "../src/model.js";
import { BARE_UNIFIED_PATCH, MULTI_FILE_PATCH, RENAME_AND_BINARY_PATCH } from "./fixtures.js";

describe("scanPatchSections", () => {
  test("splits a git patch into files and hunks", () => {
    const sections = scanPatchSections(MULTI_FILE_PATCH);
    expect(sections).toHaveLength(2);
    expect(sections[0].hunks).toHaveLength(2);
    expect(sections[1].hunks).toHaveLength(1);
    expect(MULTI_FILE_PATCH.slice(sections[0].start, sections[0].headerEnd)).toContain(
      "diff --git a/src/a.ts",
    );
    expect(MULTI_FILE_PATCH.slice(sections[0].hunks[1].start, sections[0].hunks[1].end)).toBe(
      "@@ -20,3 +21,3 @@ function tail() {\n const x = 1;\n-const y = 2;\n+const y = 3;\n const z = 4;\n",
    );
  });

  test("splits a bare unified diff on --- headers", () => {
    const sections = scanPatchSections(BARE_UNIFIED_PATCH);
    expect(sections).toHaveLength(2);
    expect(sections.map((section) => section.hunks.length)).toEqual([1, 1]);
  });

  test("returns nothing for text that is not a patch", () => {
    expect(scanPatchSections("just some prose\nwith lines\n")).toEqual([]);
  });
});

describe("buildDiffModel", () => {
  test("emits a header row per file and a row per hunk", () => {
    const model = buildDiffModel(MULTI_FILE_PATCH);
    expect(model.files).toHaveLength(2);
    expect(model.rows.map((row) => `${row.kind}:${row.hunkIndex}`)).toEqual([
      "file:-1",
      "hunk:0",
      "hunk:1",
      "file:-1",
      "hunk:0",
    ]);
    expect(model.stats).toEqual({ additions: 4, deletions: 3 });
  });

  test("hunk rows carry their own patch text and source span", () => {
    const model = buildDiffModel(MULTI_FILE_PATCH);
    const [, firstHunk] = model.rows;
    expect(firstHunk.text).toStartWith("@@ -1,3 +1,4 @@");
    expect(firstHunk.text).toContain("+const c = 3;");
    expect(firstHunk.source?.primary.start.line).toBe(4);
    expect(diffRowAdapter.getText(firstHunk)).toBe(firstHunk.text);
    expect(diffRowAdapter.getSource(firstHunk)).toBe(firstHunk.source);
  });

  test("row keys are unique and stable across rebuilds", () => {
    const keys = buildDiffModel(MULTI_FILE_PATCH).rows.map((row) => diffRowAdapter.getKey(row));
    expect(new Set(keys).size).toBe(keys.length);
    expect(buildDiffModel(MULTI_FILE_PATCH).rows.map((row) => row.key)).toEqual(keys);
  });

  test("hunk rows narrow the file metadata to a single hunk", () => {
    const model = buildDiffModel(MULTI_FILE_PATCH);
    const hunkRows = model.rows.filter((row) => row.kind === "hunk" && row.fileIndex === 0);
    expect(hunkRows).toHaveLength(2);
    for (const row of hunkRows) {
      expect(row.file.metadata.hunks).toHaveLength(1);
      // Whole-file line arrays stay intact so line numbers and collapsed-gap
      // counts still resolve against the complete file.
      expect(row.file.metadata.additionLines).toEqual(row.parent.metadata.additionLines);
    }
    expect(hunkRows[1].file.metadata.hunks[0].collapsedBefore).toBe(16);
  });

  test("a file with no hunks contributes a single body row", () => {
    const model = buildDiffModel(RENAME_AND_BINARY_PATCH);
    const binaryRows = model.rows.filter((row) => row.fileIndex === 1);
    expect(binaryRows.map((row) => row.kind)).toEqual(["file", "body"]);
    expect(binaryRows[1].text).toContain("Binary files");
  });

  test("keeps rename metadata on the file row", () => {
    const model = buildDiffModel(RENAME_AND_BINARY_PATCH);
    expect(model.files[0].previousPath).toBe("old.txt");
    expect(model.rows[0].parent.path).toBe("new.txt");
  });

  test("handles bare unified diffs", () => {
    const model = buildDiffModel(BARE_UNIFIED_PATCH);
    expect(model.files).toHaveLength(2);
    expect(model.rows.filter((row) => row.kind === "hunk")).toHaveLength(2);
    expect(model.rows[1].source).not.toBeNull();
  });

  test("empty input yields no rows", () => {
    const model = buildDiffModel("");
    expect(model.files).toEqual([]);
    expect(model.rows).toEqual([]);
    expect(model.stats).toEqual({ additions: 0, deletions: 0 });
  });
});
