import { describe, expect, test } from "bun:test";

import { argsSummary, formatBytes, imageLabel, previewLines } from "../part-format.js";

describe("part format", () => {
  test("previewLines keeps the first or the last lines and counts the rest", () => {
    const text = "1\n2\n3\n4\n5\n";

    expect(previewLines(text, 2)).toEqual({ hidden: 3, text: "1\n2" });
    expect(previewLines(text, 2, "end")).toEqual({ hidden: 3, text: "4\n5" });
    expect(previewLines(text, 9)).toEqual({ hidden: 0, text: "1\n2\n3\n4\n5" });
  });

  test("sizes and image labels", () => {
    expect(formatBytes(68)).toBe("68 B");
    expect(formatBytes(12_595)).toBe("12.3 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
    expect(imageLabel({ bytes: 12_595, kind: "image", mimeType: "image/jpeg" })).toBe(
      "[image jpeg · 12.3 KB]"
    );
  });

  test("argsSummary drops empty objects and cuts long arguments", () => {
    expect(argsSummary("{}")).toBe("");
    expect(argsSummary(`{"pattern":"${"x".repeat(100)}"}`, 20)).toHaveLength(20);
  });
});
