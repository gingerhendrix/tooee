import { describe, expect, test } from "bun:test"
import type { KeyEvent } from "@opentui/core"
import { DEFAULT_SEQUENCE_TIMEOUT_MS, SequenceTracker } from "../src/sequence.js"
import type { ParsedHotkey } from "../src/types.js"

const SPACE_THEN_N: ParsedHotkey[] = [
  {
    steps: [
      { key: "space", ctrl: false, meta: false, shift: false, option: false },
      { key: "n", ctrl: false, meta: false, shift: false, option: false },
    ],
  },
]

describe("SequenceTracker", () => {
  test("keeps pending multi-key combos alive beyond the old 500ms default", async () => {
    let resets = 0
    const tracker = new SequenceTracker({ onReset: () => resets++ })

    expect(DEFAULT_SEQUENCE_TIMEOUT_MS).toBe(1500)
    expect(tracker.feedWithState(key("space"), SPACE_THEN_N).pending).toEqual({
      prefixLength: 1,
      indexes: [0],
    })

    await sleep(600)

    expect(tracker.feed(key("n"), SPACE_THEN_N)).toBe(0)
    expect(resets).toBe(1)
  })

  test("resets pending multi-key combos after the configured timeout", async () => {
    let resets = 0
    const tracker = new SequenceTracker({ timeout: 20, onReset: () => resets++ })

    expect(tracker.feedWithState(key("space"), SPACE_THEN_N).pending).not.toBeNull()

    await sleep(40)

    expect(resets).toBe(1)
    expect(tracker.feed(key("n"), SPACE_THEN_N)).toBe(-1)
  })
})

function key(name: string): KeyEvent {
  return {
    name,
    ctrl: false,
    meta: false,
    shift: false,
    option: false,
  } as KeyEvent
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
