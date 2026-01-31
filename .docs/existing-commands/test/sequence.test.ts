import { describe, expect, test } from "bun:test"
import { SequenceTracker } from "../src/sequence.ts"
import { parseHotkey } from "../src/parse.ts"
import type { KeyEvent } from "@opentui/core"

function makeKeyEvent(name: string, mods?: Partial<KeyEvent>): KeyEvent {
  return {
    name,
    ctrl: false,
    meta: false,
    shift: false,
    option: false,
    sequence: "",
    number: false,
    raw: "",
    eventType: "press",
    source: "raw",
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {},
    stopPropagation() {},
    ...mods,
  } as KeyEvent
}

describe("SequenceTracker", () => {
  test("matches single-step hotkey", () => {
    const tracker = new SequenceTracker()
    const hotkeys = [parseHotkey("a")]
    const result = tracker.feed(makeKeyEvent("a"), hotkeys)
    expect(result).toBe(0)
  })

  test("matches two-step sequence", () => {
    const tracker = new SequenceTracker()
    const hotkeys = [parseHotkey("g g")]

    const r1 = tracker.feed(makeKeyEvent("g"), hotkeys)
    expect(r1).toBe(-1)

    const r2 = tracker.feed(makeKeyEvent("g"), hotkeys)
    expect(r2).toBe(0)
  })

  test("resets on wrong key", () => {
    const tracker = new SequenceTracker()
    const hotkeys = [parseHotkey("g g")]

    tracker.feed(makeKeyEvent("g"), hotkeys)
    tracker.feed(makeKeyEvent("x"), hotkeys) // wrong key
    const r = tracker.feed(makeKeyEvent("g"), hotkeys)
    expect(r).toBe(-1) // need another g
  })

  test("matches correct hotkey among multiple", () => {
    const tracker = new SequenceTracker()
    const hotkeys = [parseHotkey("a"), parseHotkey("b")]

    expect(tracker.feed(makeKeyEvent("b"), hotkeys)).toBe(1)
  })

  test("matches modifier hotkey", () => {
    const tracker = new SequenceTracker()
    const hotkeys = [parseHotkey("ctrl+s")]

    expect(tracker.feed(makeKeyEvent("s", { ctrl: true }), hotkeys)).toBe(0)
  })

  test("resets buffer after match", () => {
    const tracker = new SequenceTracker()
    const hotkeys = [parseHotkey("g g")]

    tracker.feed(makeKeyEvent("g"), hotkeys)
    tracker.feed(makeKeyEvent("g"), hotkeys) // match, resets

    // Need two more g's for next match
    const r1 = tracker.feed(makeKeyEvent("g"), hotkeys)
    expect(r1).toBe(-1)
    const r2 = tracker.feed(makeKeyEvent("g"), hotkeys)
    expect(r2).toBe(0)
  })

  test("timeout resets buffer", async () => {
    const tracker = new SequenceTracker({ timeout: 50 })
    const hotkeys = [parseHotkey("g g")]

    tracker.feed(makeKeyEvent("g"), hotkeys)
    await new Promise((r) => setTimeout(r, 100))

    // Buffer should have been reset by timeout
    const result = tracker.feed(makeKeyEvent("g"), hotkeys)
    expect(result).toBe(-1) // only one g since reset
  })
})
