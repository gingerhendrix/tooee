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
      const set = new MarkSet("test", 100, input)
      expect(set.size).toBe(2)
      expect(input[0].range.from.line).toBe(5)
    })

    test("freezes marks so they cannot be mutated", () => {
      const set = new MarkSet("test", 100, [mark(1)])
      const items = [...set]
      expect(() => {
        ;(items[0] as any).style = { background: "hacked" }
      }).toThrow()
      expect(() => {
        ;(items[0].style as any).background = "hacked"
      }).toThrow()
      expect(() => {
        ;(items[0].range as any).from = { line: 999 }
      }).toThrow()
      expect(() => {
        ;(items[0].range.from as any).line = 999
      }).toThrow()
    })

    test("handles inverted range (start > end) gracefully", () => {
      // Inverted range: from.line > to.line — treated as a zero-width mark
      const inverted: Mark = {
        range: { from: { line: 10 }, to: { line: 5 } },
        style: { background: "inv" },
      }
      const set = new MarkSet("test", 100, [inverted])
      expect(set.size).toBe(1)
      // The mark starts at 10, ends at 5 — won't match lines 5-10
      // because from > to makes the range empty
      expect(set.marksAtLine(7)).toHaveLength(0)
      expect(set.marksAtLine(10)).toHaveLength(1) // from.line matches
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
      const set = new MarkSet("test", 100, [mark(5, 5, "a"), mark(5, 5, "b")])
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

    test("backward scan finds long-range marks behind short ones", () => {
      // Regression: ensure early termination doesn't skip long-range marks
      // that appear before short-range marks in sorted order.
      const set = new MarkSet("test", 100, [
        mark(1, 100), // long range starting early
        mark(10, 12), // short range in the middle
        mark(20, 21), // another short range
      ])
      // Line 50 is only covered by the first mark (1-100)
      expect(set.marksAtLine(50)).toHaveLength(1)
      expect(set.marksAtLine(50)[0].range.from.line).toBe(1)
      // Line 11 is covered by marks 1-100 and 10-12
      expect(set.marksAtLine(11)).toHaveLength(2)
    })
  })

  describe("marksInRange", () => {
    test("returns empty for empty set", () => {
      const set = new MarkSet("test", 100, [])
      expect(set.marksInRange(0, 10)).toEqual([])
    })

    test("finds marks within range", () => {
      const set = new MarkSet("test", 100, [mark(1), mark(5), mark(10), mark(15)])
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

  describe("forVisibleRows", () => {
    test("clips range marks to the visible rows", () => {
      const set = new MarkSet("test", 100, [
        {
          range: { from: { line: 2 }, to: { line: 5 } },
          style: { background: "#abcdef" },
        },
      ])

      expect([...set.forVisibleRows(3, 4)]).toEqual([
        { row: 3, background: "#abcdef" },
        { row: 4, background: "#abcdef" },
      ])
    })

    test("emits gutter backgrounds and signs", () => {
      const set = new MarkSet("test", 100, [
        {
          range: { from: { line: 1 }, to: { line: 1 } },
          style: {
            gutterBackground: "#112233",
            signBefore: "!",
            signAfter: ">",
            foreground: "#445566",
          },
        },
      ])

      expect([...set.forVisibleRows(0, 2)]).toEqual([
        {
          row: 1,
          gutterBackground: "#112233",
          sign: { text: "!>", fg: "#445566" },
        },
      ])
    })
  })
})
