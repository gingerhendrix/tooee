import { test, expect, describe } from "bun:test";
import { isDiffPatch } from "../src/detect.js";
import { BARE_UNIFIED_PATCH, MULTI_FILE_PATCH, RENAME_AND_BINARY_PATCH } from "./fixtures.js";

describe("isDiffPatch", () => {
  test("accepts git and bare unified patches", () => {
    expect(isDiffPatch(MULTI_FILE_PATCH)).toBe(true);
    expect(isDiffPatch(BARE_UNIFIED_PATCH)).toBe(true);
    expect(isDiffPatch(RENAME_AND_BINARY_PATCH)).toBe(true);
  });

  test("rejects prose, code and Markdown", () => {
    expect(isDiffPatch("")).toBe(false);
    expect(isDiffPatch("# Title\n\n--- a horizontal rule of sorts\n")).toBe(false);
    expect(isDiffPatch("const a = 1;\nexport { a };\n")).toBe(false);
  });

  test("needs both a file header and a hunk header", () => {
    expect(isDiffPatch("diff --git a/x b/x\nindex 1..2 100644\n")).toBe(false);
    expect(isDiffPatch("@@ -1 +1 @@\n-a\n+b\n")).toBe(false);
  });
});
