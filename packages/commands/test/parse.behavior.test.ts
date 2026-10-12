import { describe, expect, test } from "bun:test";

import { keyEvent as key } from "@tooee/test-support";

import { matchStep } from "../src/match.js";
import { parseHotkey } from "../src/parse.js";

describe("parseHotkey super modifier (R-06)", () => {
  test("super is tracked in the parsed step", () => {
    const parsed = parseHotkey("super+q");
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.steps[0].super).toBe(true);
    expect(parsed.steps[0].key).toBe("q");
  });

  test("super+q does not match a plain q keypress", () => {
    const parsed = parseHotkey("super+q");
    expect(matchStep(key("q"), parsed.steps[0])).toBe(false);
  });

  test("super+q matches a q keypress with super held", () => {
    const parsed = parseHotkey("super+q");
    expect(matchStep(key("q", { super: true }), parsed.steps[0])).toBe(true);
  });

  test("a plain hotkey does not match a keypress with super held", () => {
    const parsed = parseHotkey("q");
    expect(matchStep(key("q", { super: true }), parsed.steps[0])).toBe(false);
  });

  test("steps without an explicit super field still match plain keypresses", () => {
    // Back-compat: ParsedStep.super is optional
    expect(
      matchStep(key("q"), { ctrl: false, key: "q", meta: false, option: false, shift: false })
    ).toBe(true);
  });
});

describe("parseHotkey leader handling (R-06)", () => {
  test("<leader> with a configured leader expands to leader + follow", () => {
    const parsed = parseHotkey("<leader>n", "space");
    expect(parsed.steps).toHaveLength(2);
    expect(parsed.steps[0].key).toBe("space");
    expect(parsed.steps[1].key).toBe("n");
  });

  test("<leader> with no configured leader is unmatchable, not ctrl+x", () => {
    const parsed = parseHotkey("<leader>n");
    expect(parsed.steps).toHaveLength(0);
  });
});

describe("parseHotkey plus key", () => {
  test("a bare + is the plus key", () => {
    const parsed = parseHotkey("+");
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.steps[0].key).toBe("+");
    expect(matchStep(key("+"), parsed.steps[0])).toBe(true);
  });

  test("ctrl++ is ctrl with the plus key", () => {
    const [step] = parseHotkey("ctrl++").steps;
    expect(step.key).toBe("+");
    expect(step.ctrl).toBe(true);
  });

  test("+ works as a step in a sequence", () => {
    const parsed = parseHotkey("z +");
    expect(parsed.steps.map((step) => step.key)).toEqual(["z", "+"]);
  });
});
