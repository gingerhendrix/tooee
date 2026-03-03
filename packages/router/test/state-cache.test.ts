import { test, expect, describe } from "bun:test"
import { StateCache } from "@tooee/router"

describe("StateCache", () => {
  test("save and restore returns same value", () => {
    const cache = new StateCache()
    cache.save("0:home", { scrollY: 42 })
    expect(cache.restore("0:home")).toEqual({ scrollY: 42 })
  })

  test("restore unknown key returns undefined", () => {
    const cache = new StateCache()
    expect(cache.restore("0:unknown")).toBeUndefined()
  })

  test("clear removes entry", () => {
    const cache = new StateCache()
    cache.save("0:home", { data: true })
    cache.clear("0:home")
    expect(cache.restore("0:home")).toBeUndefined()
  })

  test("overwrite replaces value", () => {
    const cache = new StateCache()
    cache.save("0:home", { v: 1 })
    cache.save("0:home", { v: 2 })
    expect(cache.restore("0:home")).toEqual({ v: 2 })
  })

  test("clearAll removes all entries", () => {
    const cache = new StateCache()
    cache.save("0:home", { a: 1 })
    cache.save("1:detail", { b: 2 })
    cache.clearAll()
    expect(cache.restore("0:home")).toBeUndefined()
    expect(cache.restore("1:detail")).toBeUndefined()
  })
})
