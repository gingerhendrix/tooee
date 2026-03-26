import { test, expect, describe } from "bun:test"
import { MarkSetBuilder } from "@tooee/marks"

describe("MarkSetBuilder", () => {
  test("addLine creates single-line mark", () => {
    const set = new MarkSetBuilder().addLine(5, { background: "red" }).build("test", 100)

    expect(set.size).toBe(1)
    const marks = set.marksAtLine(5)
    expect(marks).toHaveLength(1)
    expect(marks[0].style.background).toBe("red")
    expect(marks[0].range.from.line).toBe(5)
    expect(marks[0].range.to.line).toBe(5)
  })

  test("addLine with data", () => {
    const set = new MarkSetBuilder()
      .addLine(3, { foreground: "blue" }, { label: "info" })
      .build("test", 100)

    const marks = set.marksAtLine(3)
    expect(marks[0].data).toEqual({ label: "info" })
  })

  test("addRange creates range mark", () => {
    const set = new MarkSetBuilder()
      .addRange({ line: 2 }, { line: 8 }, { background: "yellow" })
      .build("test", 100)

    expect(set.size).toBe(1)
    expect(set.marksAtLine(5)).toHaveLength(1)
    expect(set.marksAtLine(1)).toHaveLength(0)
    expect(set.marksAtLine(9)).toHaveLength(0)
  })

  test("addRange with data", () => {
    const set = new MarkSetBuilder()
      .addRange({ line: 1 }, { line: 3 }, { signBefore: ">" }, "selection")
      .build("test", 100)

    const marks = set.marksAtLine(2)
    expect(marks[0].data).toBe("selection")
  })

  test("addMark adds raw mark", () => {
    const set = new MarkSetBuilder()
      .addMark({
        id: "custom",
        range: { from: { line: 10 }, to: { line: 10 } },
        style: { themeColor: "accent" },
        priority: 999,
      })
      .build("test", 100)

    const marks = set.marksAtLine(10)
    expect(marks[0].id).toBe("custom")
    expect(marks[0].priority).toBe(999)
  })

  test("chaining multiple adds", () => {
    const set = new MarkSetBuilder()
      .addLine(1, { background: "a" })
      .addLine(2, { background: "b" })
      .addRange({ line: 5 }, { line: 7 }, { background: "c" })
      .addMark({
        range: { from: { line: 10 }, to: { line: 10 } },
        style: { background: "d" },
      })
      .build("ns", 200)

    expect(set.size).toBe(4)
    expect(set.namespace).toBe("ns")
    expect(set.priority).toBe(200)
  })

  test("build produces sorted set", () => {
    const set = new MarkSetBuilder()
      .addLine(10, { background: "a" })
      .addLine(1, { background: "b" })
      .addLine(5, { background: "c" })
      .build("test", 100)

    const lines = [...set].map((m) => m.range.from.line)
    expect(lines).toEqual([1, 5, 10])
  })
})
