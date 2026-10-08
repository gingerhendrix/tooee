import { describe, expect, test } from "bun:test";

import { itemUrl, languageFor, parseItemSource } from "../../data/source.js";
import { FIXTURE_ITEM } from "../support/fake-termcn.js";

describe("parseItemSource", () => {
  test("returns each file with its install target and language", () => {
    expect(parseItemSource(FIXTURE_ITEM)).toEqual([
      {
        content: "export const KeyEcho = () => null;\n",
        language: "tsx",
        target: "components/ui/key-echo.tsx",
      },
    ]);
  });

  test("falls back to the registry path and skips files without content", () => {
    const text = JSON.stringify({
      files: [{ content: "x", path: "lib/a.ts" }, { path: "lib/b.ts" }],
    });

    expect(parseItemSource(text)).toEqual([
      { content: "x", language: "typescript", target: "lib/a.ts" },
    ]);
  });

  test("rejects an item without files", () => {
    expect(() => parseItemSource("[]")).toThrow("registry item has no files array");
  });
});

describe("source helpers", () => {
  test("builds the item URL and picks languages by extension", () => {
    expect(itemUrl("box")).toBe("https://www.termcn.dev/r/opentui/box.json");
    expect(languageFor("a.json")).toBe("json");
    expect(languageFor("README")).toBe("text");
  });
});
