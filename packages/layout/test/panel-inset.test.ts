import { describe, expect, test } from "bun:test";

import { resolvePanelInset } from "../src/panel-inset.js";

describe("resolvePanelInset", () => {
  test("rounds percentages to whole cells of the container", () => {
    expect(
      resolvePanelInset(
        { bottom: "15%", left: "15%", right: "15%", top: "15%" },
        { height: 38, width: 120 }
      )
    ).toEqual({ bottom: 6, left: 18, right: 18, top: 6 });
  });

  test("defaults every edge to 20%", () => {
    expect(resolvePanelInset(undefined, { height: 24, width: 80 })).toEqual({
      bottom: 5,
      left: 16,
      right: 16,
      top: 5,
    });
  });

  test("keeps numbers and auto unchanged", () => {
    expect(
      resolvePanelInset({ bottom: "auto", left: 3, right: "10%" }, { height: 30, width: 75 })
    ).toEqual({ bottom: "auto", left: 3, right: 8, top: 6 });
  });

  test("passes percentages through before the container has a size", () => {
    expect(resolvePanelInset({ top: "15%" })).toEqual({
      bottom: "20%",
      left: "20%",
      right: "20%",
      top: "15%",
    });
  });
});
