import { describe, expect, test } from "bun:test"
import { createViewCommandContext } from "../src/hooks/useViewCommandContext.js"
import { MarkSet } from "@tooee/marks"

const providerMark = new MarkSet("provider", 1, [])
const userMark = new MarkSet("user", 1, [])

describe("createViewCommandContext", () => {
  test("creates a safe headless custom content context", () => {
    const ctx = createViewCommandContext({ mode: "cursor" })

    expect(ctx.content).toEqual({ format: "custom", data: undefined, title: undefined })
    expect(ctx.format).toBe("custom")
    expect(ctx.title).toBeUndefined()
    expect(ctx.data).toBeUndefined()
    expect(ctx.cursor).toBeNull()
    expect(ctx.selection).toBeNull()
    expect(ctx.mode).toBe("cursor")
    expect(ctx.toggledIndices).toBeInstanceOf(Set)
    expect(ctx.toggledIndices.size).toBe(0)

    expect(() => ctx.reload()).not.toThrow()
    expect(() => ctx.marks.setMarkSet(userMark)).not.toThrow()
    expect(() => ctx.marks.clearNamespace("user")).not.toThrow()
    expect(() => ctx.marks.clearAll()).not.toThrow()
    expect(ctx.marks.userMarks).toEqual([])
    expect(ctx.marks.providerMarks).toEqual([])
  })

  test("maps navigation, title/data, marks, and extras", () => {
    const toggledIndices = new Set([1, 3])
    const reload = () => {}
    const setMarkSet = () => {}
    const clearNamespace = () => {}
    const clearAll = () => {}

    const ctx = createViewCommandContext({
      mode: "select",
      format: "dashboard",
      title: "Dashboard",
      data: { rowCount: 10 },
      nav: {
        cursor: 3,
        selection: { start: 1, end: 3 },
        toggledIndices,
      },
      reload,
      marks: {
        setMarkSet,
        clearNamespace,
        clearAll,
        userMarks: [userMark],
        providerMarks: [providerMark],
      },
      extras: {
        activeRow: { id: "stream-1" },
        rowCount: 10,
      },
    })

    expect(ctx.content).toEqual({
      format: "dashboard",
      data: { rowCount: 10 },
      title: "Dashboard",
    })
    expect(ctx.format).toBe("dashboard")
    expect(ctx.title).toBe("Dashboard")
    expect(ctx.data).toEqual({ rowCount: 10 })
    expect(ctx.cursor).toBe(3)
    expect(ctx.selection).toEqual({ start: 1, end: 3 })
    expect(ctx.mode).toBe("select")
    expect(ctx.toggledIndices).toBe(toggledIndices)
    expect(ctx.reload).toBe(reload)
    expect(ctx.marks.setMarkSet).toBe(setMarkSet)
    expect(ctx.marks.clearNamespace).toBe(clearNamespace)
    expect(ctx.marks.clearAll).toBe(clearAll)
    expect(ctx.marks.userMarks).toEqual([userMark])
    expect(ctx.marks.providerMarks).toEqual([providerMark])
    expect(ctx.activeRow).toEqual({ id: "stream-1" })
    expect(ctx.rowCount).toBe(10)
  })

  test("explicit cursor and selection override nav", () => {
    const ctx = createViewCommandContext({
      mode: "cursor",
      nav: {
        cursor: 9,
        selection: { start: 8, end: 9 },
        toggledIndices: new Set([9]),
      },
      cursor: 2,
      selection: { start: 2, end: 4 },
      toggledIndices: new Set([2]),
    })

    expect(ctx.cursor).toBe(2)
    expect(ctx.selection).toEqual({ start: 2, end: 4 })
    expect(Array.from(ctx.toggledIndices)).toEqual([2])
  })
})
