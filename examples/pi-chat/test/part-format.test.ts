import { describe, expect, test } from "bun:test";

import {
  argsSummary,
  formatBytes,
  IMAGE_MAX_ROWS,
  imageCells,
  imageLabel,
  previewLines,
} from "../part-format.js";

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
    expect(imageLabel({ bytes: 12_595, mimeType: "image/jpeg" })).toBe("[image jpeg · 12.3 KB]");
  });

  test("imageCells keeps small images small and caps tall ones, at the image's aspect ratio", () => {
    expect(imageCells({ height: 1, width: 1 })).toEqual({ height: 1, width: 2 });
    expect(imageCells({ height: 480, width: 1200 })).toEqual({ height: IMAGE_MAX_ROWS, width: 60 });
    expect(imageCells({ height: 100, width: 100 })).toEqual({ height: 5, width: 10 });
    expect(imageCells({ height: 4000, width: 10 }, 6)).toEqual({ height: 6, width: 1 });
  });

  test("argsSummary drops empty objects and cuts long arguments", () => {
    expect(argsSummary("{}")).toBe("");
    expect(argsSummary(`{"pattern":"${"x".repeat(100)}"}`, 20)).toHaveLength(20);
  });
});
