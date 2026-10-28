import { describe, expect, test } from "bun:test";
import path from "node:path";

import { marked } from "marked";

import {
  markdownImageBox,
  parseObsidianImageEmbed,
  resolveMarkdownImageSource,
  splitMarkdownImages,
} from "../src/markdown-images.js";

describe("Obsidian image embeds", () => {
  test("parses plain, aliased, and sized embeds", () => {
    expect(parseObsidianImageEmbed("![[assets/cover.png]]")).toEqual({
      source: "assets/cover.png",
    });
    expect(parseObsidianImageEmbed("![[assets/cover.png|Cover art]]")).toEqual({
      alt: "Cover art",
      source: "assets/cover.png",
    });
    expect(parseObsidianImageEmbed("![[assets/cover.png|40x12]]")).toEqual({
      height: 12,
      source: "assets/cover.png",
      width: 40,
    });
    expect(parseObsidianImageEmbed("![[assets/cover.png|40]]")).toEqual({
      source: "assets/cover.png",
      width: 40,
    });
  });

  test("splits standard Markdown and Obsidian images from surrounding text", () => {
    const [paragraph] = marked.lexer(
      "Before ![standard](images/one.png) middle ![[images/two.webp|20x8]] after"
    );

    if (paragraph?.type !== "paragraph") {
      throw new Error("Expected a paragraph token");
    }

    const segments = splitMarkdownImages(paragraph.tokens);
    expect(segments.map((segment) => segment.type)).toEqual([
      "text",
      "image",
      "text",
      "image",
      "text",
    ]);
    expect(segments[1]).toMatchObject({
      alt: "standard",
      source: "images/one.png",
      type: "image",
    });
    expect(segments[3]).toMatchObject({
      height: 8,
      source: "images/two.webp",
      type: "image",
      width: 20,
    });
  });

  test("resolves local links against the Markdown directory and preserves URLs", () => {
    expect(resolveMarkdownImageSource("images/cover.png", "/vault/note-folder")).toBe(
      path.join("/vault/note-folder", "images/cover.png")
    );
    expect(resolveMarkdownImageSource("https://example.com/cover.png", "/vault")).toBe(
      "https://example.com/cover.png"
    );
    expect(resolveMarkdownImageSource("data:image/png;base64,abc", "/vault")).toBe(
      "data:image/png;base64,abc"
    );
  });
});

describe("markdownImageBox", () => {
  const geometry = { aspect: 2, cellWidth: 10 };
  const limits = { maxCols: 100, maxRows: 30 };

  test("is empty until the image pixel size is known", () => {
    expect(markdownImageBox({ source: "a.png" }, null, geometry, limits)).toEqual({
      cols: 0,
      rows: 0,
    });
  });

  test("follows the pixel size and shrinks only to the limits", () => {
    expect(
      markdownImageBox({ source: "a.png" }, { height: 100, width: 300 }, geometry, limits)
    ).toEqual({ cols: 30, rows: 5 });
    expect(
      markdownImageBox({ source: "a.png" }, { height: 1200, width: 1600 }, geometry, limits)
    ).toEqual({ cols: 80, rows: 30 });
  });

  test("keeps an explicit Obsidian width and height", () => {
    expect(
      markdownImageBox(
        { height: 12, source: "a.png", width: 40 },
        { height: 100, width: 300 },
        geometry,
        limits
      )
    ).toEqual({ cols: 40, rows: 12 });
  });

  test("derives the rows of an explicit Obsidian width from the aspect ratio", () => {
    expect(
      markdownImageBox(
        { source: "a.png", width: 60 },
        { height: 100, width: 300 },
        geometry,
        limits
      )
    ).toEqual({ cols: 60, rows: 10 });
  });
});
