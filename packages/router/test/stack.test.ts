import { test, expect, describe } from "bun:test"
import { stackReducer } from "@tooee/router"
import type { RouterState } from "@tooee/router"

function makeState(...routeIds: string[]): RouterState {
  return {
    stack: routeIds.map((routeId) => ({ routeId, params: {} })),
  }
}

describe("stackReducer", () => {
  test("push adds entry to stack", () => {
    const state = makeState("home")
    const next = stackReducer(state, { type: "push", routeId: "detail" })
    expect(next.stack).toHaveLength(2)
    expect(next.stack[1].routeId).toBe("detail")
  })

  test("push preserves params", () => {
    const state = makeState("home")
    const next = stackReducer(state, {
      type: "push",
      routeId: "detail",
      params: { id: "123" },
    })
    expect(next.stack[1].params).toEqual({ id: "123" })
  })

  test("push defaults params to empty object", () => {
    const state = makeState("home")
    const next = stackReducer(state, { type: "push", routeId: "detail" })
    expect(next.stack[1].params).toEqual({})
  })

  test("pop removes last entry", () => {
    const state = makeState("home", "detail")
    const next = stackReducer(state, { type: "pop" })
    expect(next.stack).toHaveLength(1)
    expect(next.stack[0].routeId).toBe("home")
  })

  test("pop is no-op at stack bottom", () => {
    const state = makeState("home")
    const next = stackReducer(state, { type: "pop" })
    expect(next).toBe(state) // same reference
    expect(next.stack).toHaveLength(1)
  })

  test("replace swaps last entry", () => {
    const state = makeState("home", "detail")
    const next = stackReducer(state, {
      type: "replace",
      routeId: "settings",
      params: { tab: "general" },
    })
    expect(next.stack).toHaveLength(2)
    expect(next.stack[0].routeId).toBe("home")
    expect(next.stack[1].routeId).toBe("settings")
    expect(next.stack[1].params).toEqual({ tab: "general" })
  })

  test("reset clears stack to single entry", () => {
    const state = makeState("home", "detail", "nested")
    const next = stackReducer(state, { type: "reset", routeId: "home" })
    expect(next.stack).toHaveLength(1)
    expect(next.stack[0].routeId).toBe("home")
  })

  test("reset preserves params", () => {
    const state = makeState("home", "detail")
    const next = stackReducer(state, {
      type: "reset",
      routeId: "settings",
      params: { fresh: true },
    })
    expect(next.stack).toHaveLength(1)
    expect(next.stack[0].params).toEqual({ fresh: true })
  })

  test("push then pop returns to original", () => {
    const state = makeState("home")
    const pushed = stackReducer(state, { type: "push", routeId: "detail" })
    const popped = stackReducer(pushed, { type: "pop" })
    expect(popped.stack).toHaveLength(1)
    expect(popped.stack[0].routeId).toBe("home")
  })
})
