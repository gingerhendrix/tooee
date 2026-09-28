import { test, expect, describe } from "bun:test";

import { bold } from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import { loadThemes, resolveTheme } from "@tooee/themes";
import { Lexer } from "marked";

import { inlineTokensToChunks } from "../src/markdown/chunks.js";
import { chunkLinkAt } from "../src/markdown/table-links.js";

const [firstTheme] = loadThemes().values();
if (firstTheme === undefined) {
  throw new Error("no bundled theme");
}
const theme = resolveTheme(firstTheme, "dark");

const chunk = function chunk(text: string, url?: string): TextChunk {
  return url === undefined ? { __isChunk: true, text } : { __isChunk: true, link: { url }, text };
};

describe("inlineTokensToChunks", () => {
  test("link chunks carry the OSC 8 link URL", () => {
    const chunks = inlineTokensToChunks(
      Lexer.lexInline("see [the **plan**](docs/plan.md) now"),
      theme
    );
    expect(chunks.map((item) => [item.text, item.link?.url])).toEqual([
      ["see ", undefined],
      ["the ", "docs/plan.md"],
      ["plan", "docs/plan.md"],
      [" now", undefined],
    ]);
  });

  test("bold styling keeps the link URL", () => {
    const [linked] = inlineTokensToChunks(Lexer.lexInline("[x](a.md)"), theme);
    expect(linked === undefined ? undefined : bold(linked).link?.url).toBe("a.md");
  });
});

describe("chunkLinkAt", () => {
  const chunks = [chunk("go "), chunk("here", "a.md"), chunk(" or "), chunk("there", "b.md")];

  test("returns the URL of the chunk under the offset", () => {
    expect(chunkLinkAt(chunks, 0, 3)).toBe("a.md");
    expect(chunkLinkAt(chunks, 0, 6)).toBe("a.md");
    expect(chunkLinkAt(chunks, 0, 11)).toBe("b.md");
  });

  test("returns null for plain text and positions past the end", () => {
    expect(chunkLinkAt(chunks, 0, 0)).toBeNull();
    expect(chunkLinkAt(chunks, 0, 8)).toBeNull();
    expect(chunkLinkAt(chunks, 0, 40)).toBeNull();
    expect(chunkLinkAt(chunks, 1, 0)).toBeNull();
  });

  test("counts wide characters by display width and follows newlines", () => {
    const wide = [chunk("日本 "), chunk("link", "w.md"), chunk("\nnext "), chunk("x", "n.md")];
    expect(chunkLinkAt(wide, 0, 4)).toBeNull();
    expect(chunkLinkAt(wide, 0, 5)).toBe("w.md");
    expect(chunkLinkAt(wide, 1, 5)).toBe("n.md");
  });
});
