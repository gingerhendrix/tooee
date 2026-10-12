import { describe, expect, test } from "bun:test";

import { fitTitleBar } from "../src/fit-title-bar.js";

describe("fitTitleBar", () => {
  test("keeps both parts when they fit", () => {
    expect(fitTitleBar("README.md", "markdown", 40)).toEqual({
      subtitle: "markdown",
      title: "README.md",
    });
  });

  test("shortens the subtitle first", () => {
    expect(fitTitleBar("Title", "a long subtitle here", 20)).toEqual({
      subtitle: "a long subt…",
      title: "Title",
    });
  });

  test("hides the subtitle when less than 8 cells are left", () => {
    expect(fitTitleBar("A longer title", "a long subtitle", 22)).toEqual({
      subtitle: "",
      title: "A longer title",
    });
  });

  test("keeps a short subtitle whole or hides it", () => {
    expect(fitTitleBar("Title", "md", 10)).toEqual({ subtitle: "md", title: "Title" });
    expect(fitTitleBar("Title", "md", 9)).toEqual({ subtitle: "", title: "Title" });
  });

  test("shortens the title after the subtitle hides", () => {
    expect(fitTitleBar("A very long document title", "markdown", 12)).toEqual({
      subtitle: "",
      title: "A very long…",
    });
  });
});
