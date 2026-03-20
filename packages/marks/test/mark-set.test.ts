import { test, expect, describe } from "bun:test"
import { MarkSet } from "@tooee/marks"
import type { Mark } from "@tooee/marks"

function mark(from: number, to?: number, id?: string): Mark {
  return {
    id,
    range: { from: { line: from }, to: { line: to ?? from } },
    style: { background: `bg-${from}` },
  }
}

describe("MarkSet", () => {
  describe("construction", () => {
    test("creates empty set", () => {
      const set = new MarkSet("test", 100, [])
      expect(set.size).toBe(0)
      expect(set.namespace).toBe("test")
      expect(set.priority).toBe(100)
    })

    test("sorts marks by from.line", () => {
      const set = new MarkSet("test", 100, [mark(5), mark(1), mark(3)])
      const items = [...set]
      expect(items[0].range.from.line).toBe(1)
      expect(items[1].range.from.line).toBe(3)
      expect(items[2].range.from.line).toBe(5)
    })

    test("does not mutate input array", () => {
      const input = [mark(5), mark(1)]
      new MarkSet("test", 100, input)
      expect(input[0].range.from.line).toBe(5)
    })
  })

  describe("marksAtLine", () => {
    test("returns empty for empty set", () => {
      const set = new MarkSet("test", 100, [])
      expect(set.marksAtLine(5)).toEqual([])
    })

    test("finds single-line mark", () => {
      const set = new MarkSet("test", 100, [mark(5)])
      expect(set.marksAtLine(5)).toHaveLength(1)
      expect(set.marksAtLine(4)).toHaveLength(0)
      expect(set.marksAtLine(6)).toHaveLength(0)
    })

    test("finds range mark at all lines in range", () => {
      const set = new MarkSet("test", 100, [mark(3, 7)])
      expect(set.marksAtLine(2)).toHaveLength(0)
      expect(set.marksAtLine(3)).toHaveLength(1)
      expect(set.marksAtLine(5)).toHaveLength(1)
      expect(set.marksAtLine(7)).toHaveLength(1)
      expect(set.marksAtLine(8)).toHaveLength(0)
    })

    test("finds multiple marks at same line", () => {
      const set = new MarkSet("test", 100, [
        mark(5, 5, "a"),
        mark(5, 5, "b"),
      ])
      expect(set.marksAtLine(5)).toHaveLength(2)
    })

    test("finds overlapping range marks", () => {
      const set = new MarkSet("test", 100, [mark(1, 5), mark(3, 7)])
      expect(set.marksAtLine(4)).toHaveLength(2)
      expect(set.marksAtLine(1)).toHaveLength(1)
      expect(set.marksAtLine(7)).toHaveLength(1)
    })

    test("binary search works with many marks", () => {
      const marks = Array.from({ length: 100 }, (_, i) => mark(i * 2))
      const set = new MarkSet("test", 100, marks)
      expect(set.marksAtLine(50)).toHaveLength(1)
      expect(set.marksAtLine(51)).toHaveLength(0)
      expect(set.marksAtLine(0)).toHaveLength(1)
      expect(set.marksAtLine(198)).toHaveLength(1)
    })
  })

  describe("marksInRange", () => {
    test("returns empty for empty set", () => {
      const set = new MarkSet("test", 100, [])
      expect(set.marksInRange(0, 10)).toEqual([])
    })

    test("finds marks within range", () => {
      const set = new MarkSet("test", 100, [
        mark(1),
        mark(5),
        mark(10),
        mark(15),
      ])
      const result = set.marksInRange(3, 12)
      expect(result).toHaveLength(2)
      expect(result[0].range.from.line).toBe(5)
      expect(result[1].range.from.line).toBe(10)
    })

    test("includes marks that overlap range boundaries", () => {
      const set = new MarkSet("test", 100, [mark(1, 5), mark(8, 12)])
      const result = set.marksInRange(4, 9)
      expect(result).toHaveLength(2)
    })

    test("excludes marks fully outside range", () => {
      const set = new MarkSet("test", 100, [mark(1, 2), mark(10, 11)])
      expect(set.marksInRange(5, 8)).toHaveLength(0)
    })
  })

  describe("iteration", () => {
    test("iterates in sorted order", () => {
      const set = new MarkSet("test", 100, [mark(10), mark(1), mark(5)])
      const lines = [...set].map((m) => m.range.from.line)
      expect(lines).toEqual([1, 5, 10])
    })

    test("iterates empty set", () => {
      const set = new MarkSet("test", 100, [])
      expect([...set]).toEqual([])
    })
  })
})
