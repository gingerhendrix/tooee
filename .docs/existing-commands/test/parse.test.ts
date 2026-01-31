import { describe, expect, test } from "bun:test"
import { parseHotkey } from "../src/parse.ts"

describe("parseHotkey", () => {
  test("single key", () => {
    const result = parseHotkey("a")
    expect(result.steps).toEqual([{ key: "a", ctrl: false, meta: false, shift: false, option: false }])
  })

  test("ctrl+key", () => {
    const result = parseHotkey("ctrl+s")
    expect(result.steps).toEqual([{ key: "s", ctrl: true, meta: false, shift: false, option: false }])
  })

  test("ctrl+shift+key", () => {
    const result = parseHotkey("ctrl+shift+p")
    expect(result.steps).toEqual([{ key: "p", ctrl: true, meta: false, shift: true, option: false }])
  })

  test("alt maps to meta", () => {
    const result = parseHotkey("alt+x")
    expect(result.steps).toEqual([{ key: "x", ctrl: false, meta: true, shift: false, option: false }])
  })

  test("meta modifier", () => {
    const result = parseHotkey("meta+k")
    expect(result.steps).toEqual([{ key: "k", ctrl: false, meta: true, shift: false, option: false }])
  })

  test("option modifier", () => {
    const result = parseHotkey("option+a")
    expect(result.steps).toEqual([{ key: "a", ctrl: false, meta: false, shift: false, option: true }])
  })

  test("key aliases: esc -> escape", () => {
    const result = parseHotkey("esc")
    expect(result.steps[0]!.key).toBe("escape")
  })

  test("key aliases: enter -> return", () => {
    const result = parseHotkey("enter")
    expect(result.steps[0]!.key).toBe("return")
  })

  test("key aliases: cr -> return", () => {
    const result = parseHotkey("cr")
    expect(result.steps[0]!.key).toBe("return")
  })

  test("key aliases: del -> delete", () => {
    const result = parseHotkey("del")
    expect(result.steps[0]!.key).toBe("delete")
  })

  test("key aliases: space -> ' '", () => {
    const result = parseHotkey("space")
    expect(result.steps[0]!.key).toBe(" ")
  })

  test("sequence: g g", () => {
    const result = parseHotkey("g g")
    expect(result.steps).toHaveLength(2)
    expect(result.steps[0]!.key).toBe("g")
    expect(result.steps[1]!.key).toBe("g")
  })

  test("sequence: d d", () => {
    const result = parseHotkey("d d")
    expect(result.steps).toHaveLength(2)
  })

  test("leader with default", () => {
    const result = parseHotkey("<leader>n")
    expect(result.steps).toHaveLength(2)
    // default leader is ctrl+x
    expect(result.steps[0]).toEqual({ key: "x", ctrl: true, meta: false, shift: false, option: false })
    expect(result.steps[1]).toEqual({ key: "n", ctrl: false, meta: false, shift: false, option: false })
  })

  test("leader with custom key", () => {
    const result = parseHotkey("<leader>n", "ctrl+a")
    expect(result.steps[0]).toEqual({ key: "a", ctrl: true, meta: false, shift: false, option: false })
    expect(result.steps[1]).toEqual({ key: "n", ctrl: false, meta: false, shift: false, option: false })
  })

  test("case insensitive", () => {
    const result = parseHotkey("Ctrl+S")
    expect(result.steps[0]!.ctrl).toBe(true)
    expect(result.steps[0]!.key).toBe("s")
  })
})
