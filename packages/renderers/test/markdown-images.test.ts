import path from "node:path";
import { describe, expect, test } from "bun:test";
import { marked } from "marked";
import {
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
      "Before ![standard](images/one.png) middle ![[images/two.webp|20x8]] after",
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
      path.join("/vault/note-folder", "images/cover.png"),
    );
    expect(resolveMarkdownImageSource("https://example.com/cover.png", "/vault")).toBe(
      "https://example.com/cover.png",
    );
    expect(resolveMarkdownImageSource("data:image/png;base64,abc", "/vault")).toBe(
      "data:image/png;base64,abc",
    );
  });
});
