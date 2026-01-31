import { describe, expect, test } from "bun:test"
import { matchStep } from "../src/match.ts"
import type { KeyEvent } from "@opentui/core"
import type { ParsedStep } from "../src/types.ts"

function makeKeyEvent(overrides: Partial<KeyEvent>): KeyEvent {
  return {
    name: "",
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
    ...overrides,
  } as KeyEvent
}

describe("matchStep", () => {
  test("matches plain key", () => {
    const event = makeKeyEvent({ name: "a" })
    const step: ParsedStep = { key: "a", ctrl: false, meta: false, shift: false, option: false }
    expect(matchStep(event, step)).toBe(true)
  })

  test("rejects wrong key", () => {
    const event = makeKeyEvent({ name: "b" })
    const step: ParsedStep = { key: "a", ctrl: false, meta: false, shift: false, option: false }
    expect(matchStep(event, step)).toBe(false)
  })

  test("matches ctrl+key", () => {
    const event = makeKeyEvent({ name: "s", ctrl: true })
    const step: ParsedStep = { key: "s", ctrl: true, meta: false, shift: false, option: false }
    expect(matchStep(event, step)).toBe(true)
  })

  test("rejects when ctrl expected but not pressed", () => {
    const event = makeKeyEvent({ name: "s", ctrl: false })
    const step: ParsedStep = { key: "s", ctrl: true, meta: false, shift: false, option: false }
    expect(matchStep(event, step)).toBe(false)
  })

  test("rejects when extra modifier present", () => {
    const event = makeKeyEvent({ name: "s", ctrl: true, shift: true })
    const step: ParsedStep = { key: "s", ctrl: true, meta: false, shift: false, option: false }
    expect(matchStep(event, step)).toBe(false)
  })

  test("matches all modifiers", () => {
    const event = makeKeyEvent({ name: "p", ctrl: true, shift: true, meta: true, option: true })
    const step: ParsedStep = { key: "p", ctrl: true, meta: true, shift: true, option: true }
    expect(matchStep(event, step)).toBe(true)
  })
})
