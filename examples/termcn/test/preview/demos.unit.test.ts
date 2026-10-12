import { describe, expect, test } from "bun:test";

import { demoOwner, demosForComponent } from "../../preview/demos.js";

const NAMES = ["checkbox", "checkbox-group", "spinner", "box"];

describe("demoOwner", () => {
  test("gives a demo to the longest matching component name", () => {
    expect(demoOwner("checkbox-group-demo", NAMES)).toBe("checkbox-group");
    expect(demoOwner("checkbox-demo", NAMES)).toBe("checkbox");
    expect(demoOwner("box", NAMES)).toBe("box");
  });

  test("needs a whole-word prefix", () => {
    expect(demoOwner("boxes-demo", NAMES)).toBeNull();
  });
});

describe("demosForComponent", () => {
  const available = ["spinner-demo", "spinner-styles", "spinner-extra", "box-demo"];

  test("puts docs previews first, in page order, then owned extras", () => {
    expect(
      demosForComponent("spinner", ["spinner-styles", "spinner-demo"], available, NAMES)
    ).toEqual(["spinner-styles", "spinner-demo", "spinner-extra"]);
  });

  test("drops previews that are not vendored", () => {
    expect(demosForComponent("box", ["box-missing", "box-demo"], available, NAMES)).toEqual([
      "box-demo",
    ]);
  });

  test("falls back to file names when the docs are unavailable", () => {
    expect(demosForComponent("spinner", [], available, NAMES)).toEqual([
      "spinner-demo",
      "spinner-extra",
      "spinner-styles",
    ]);
  });
});
