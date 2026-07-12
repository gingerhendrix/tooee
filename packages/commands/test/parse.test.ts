import { describe, expect, test } from "bun:test";
import type { KeyEvent } from "@opentui/core";
import { parseHotkey } from "../src/parse.js";
import { matchStep } from "../src/match.js";

const key = function key(name: string, modifiers: Partial<KeyEvent> = {}): KeyEvent {
  return {
    ctrl: false,
    meta: false,
    name,
    option: false,
    shift: false,
    ...modifiers,
  } as KeyEvent;
};

describe("parseHotkey super modifier (R-06)", () => {
  test("super is tracked in the parsed step", () => {
    const parsed = parseHotkey("super+q");
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.steps[0]!.super).toBe(true);
    expect(parsed.steps[0]!.key).toBe("q");
  });

  test("super+q does not match a plain q keypress", () => {
    const parsed = parseHotkey("super+q");
    expect(matchStep(key("q"), parsed.steps[0]!)).toBe(false);
  });

  test("super+q matches a q keypress with super held", () => {
    const parsed = parseHotkey("super+q");
    expect(matchStep(key("q", { super: true }), parsed.steps[0]!)).toBe(true);
  });

  test("a plain hotkey does not match a keypress with super held", () => {
    const parsed = parseHotkey("q");
    expect(matchStep(key("q", { super: true }), parsed.steps[0]!)).toBe(false);
  });

  test("steps without an explicit super field still match plain keypresses", () => {
    // Back-compat: ParsedStep.super is optional
    expect(
      matchStep(key("q"), { ctrl: false, key: "q", meta: false, option: false, shift: false }),
    ).toBe(true);
  });
});

describe("parseHotkey leader handling (R-06)", () => {
  test("<leader> with a configured leader expands to leader + follow", () => {
    const parsed = parseHotkey("<leader>n", "space");
    expect(parsed.steps).toHaveLength(2);
    expect(parsed.steps[0]!.key).toBe("space");
    expect(parsed.steps[1]!.key).toBe("n");
  });

  test("<leader> with no configured leader is unmatchable, not ctrl+x", () => {
    const parsed = parseHotkey("<leader>n");
    expect(parsed.steps).toHaveLength(0);
  });
});
