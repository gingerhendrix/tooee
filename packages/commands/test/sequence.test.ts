import { describe, expect, test } from "bun:test";
import type { KeyEvent } from "@opentui/core";
import {
  DEFAULT_SEQUENCE_TIMEOUT_MS,
  SequenceTracker,
  findPendingMatch,
  matchesBuffer,
  pruneBuffer,
} from "../src/sequence.js";
import type { ParsedHotkey } from "../src/types.js";

const SPACE_THEN_N: ParsedHotkey[] = [
  {
    steps: [
      { ctrl: false, key: "space", meta: false, option: false, shift: false },
      { ctrl: false, key: "n", meta: false, option: false, shift: false },
    ],
  },
];

describe("SequenceTracker", () => {
  test("keeps pending multi-key combos alive beyond the old 500ms default", async () => {
    let resets = 0;
    const tracker = new SequenceTracker({ onReset: () => resets++ });

    expect(DEFAULT_SEQUENCE_TIMEOUT_MS).toBe(1500);
    expect(tracker.feedWithState(key("space"), SPACE_THEN_N).pending).toEqual({
      indexes: [0],
      prefixLength: 1,
    });

    await sleep(600);

    expect(tracker.feed(key("n"), SPACE_THEN_N)).toBe(0);
    expect(resets).toBe(1);
  });

  test("resets pending multi-key combos after the configured timeout", async () => {
    let resets = 0;
    const tracker = new SequenceTracker({ onReset: () => resets++, timeout: 20 });

    expect(tracker.feedWithState(key("space"), SPACE_THEN_N).pending).not.toBeNull();

    await sleep(40);

    expect(resets).toBe(1);
    expect(tracker.feed(key("n"), SPACE_THEN_N)).toBe(-1);
  });
});

describe("pure sequence helpers", () => {
  const G_THEN_G: ParsedHotkey = {
    steps: [
      { ctrl: false, key: "g", meta: false, option: false, shift: false },
      { ctrl: false, key: "g", meta: false, option: false, shift: false },
    ],
  };
  const G_THEN_T: ParsedHotkey = {
    steps: [
      { ctrl: false, key: "g", meta: false, option: false, shift: false },
      { ctrl: false, key: "t", meta: false, option: false, shift: false },
    ],
  };
  const SINGLE_X: ParsedHotkey = {
    steps: [{ ctrl: false, key: "x", meta: false, option: false, shift: false }],
  };

  describe("matchesBuffer", () => {
    test("matches when the buffer tail equals the hotkey steps", () => {
      expect(matchesBuffer([key("g"), key("g")], G_THEN_G)).toBe(true);
      expect(matchesBuffer([key("x"), key("g"), key("g")], G_THEN_G)).toBe(true);
    });

    test("does not match a shorter buffer or a wrong tail", () => {
      expect(matchesBuffer([key("g")], G_THEN_G)).toBe(false);
      expect(matchesBuffer([key("g"), key("t")], G_THEN_G)).toBe(false);
    });

    test("zero-step hotkeys never match (leaderless <leader> guard)", () => {
      expect(matchesBuffer([key("g")], { steps: [] })).toBe(false);
      expect(matchesBuffer([], { steps: [] })).toBe(false);
    });
  });

  describe("findPendingMatch", () => {
    test("reports the longest pending prefix with all candidate indexes", () => {
      expect(findPendingMatch([key("g")], [G_THEN_G, G_THEN_T, SINGLE_X])).toEqual({
        indexes: [0, 1],
        prefixLength: 1,
      });
    });

    test("returns null when nothing is pending", () => {
      expect(findPendingMatch([key("z")], [G_THEN_G, G_THEN_T])).toBeNull();
      expect(findPendingMatch([], [G_THEN_G])).toBeNull();
    });

    test("full-length matches are not pending (proper prefixes only)", () => {
      expect(findPendingMatch([key("x")], [SINGLE_X])).toBeNull();
    });
  });

  describe("pruneBuffer", () => {
    test("drops entries older than the longest hotkey", () => {
      const buffer = [key("a"), key("b"), key("g")];
      expect(pruneBuffer(buffer, [G_THEN_G])).toEqual([key("b"), key("g")]);
    });

    test("returns the same array when nothing needs pruning", () => {
      const buffer = [key("g")];
      expect(pruneBuffer(buffer, [G_THEN_G])).toBe(buffer);
      const empty: KeyEvent[] = [];
      expect(pruneBuffer(empty, [])).toBe(empty);
    });
  });
});

function key(name: string): KeyEvent {
  return {
    ctrl: false,
    meta: false,
    name,
    option: false,
    shift: false,
  } as KeyEvent;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
