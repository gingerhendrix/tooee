import { test, expect, describe } from "bun:test"
import { fuzzyFilter } from "../src/fuzzy.js"
import type { ChooseItem } from "../src/types.js"

function items(...texts: string[]): ChooseItem[] {
  return texts.map((text) => ({ text }))
}

describe("fuzzyFilter", () => {
  test("empty query returns all items with score 0", () => {
    const result = fuzzyFilter(items("alpha", "beta", "gamma"), "")
    expect(result).toHaveLength(3)
    for (const m of result) {
      expect(m.score).toBe(0)
      expect(m.positions).toEqual([])
    }
    expect(result[0].originalIndex).toBe(0)
    expect(result[1].originalIndex).toBe(1)
    expect(result[2].originalIndex).toBe(2)
  })

  test("exact match scores high", () => {
    const result = fuzzyFilter(items("hello", "world"), "hello")
    expect(result).toHaveLength(1)
    expect(result[0].item.text).toBe("hello")
    // 'h' at position 0 = 3, 'e' consecutive = 1, 'l' consecutive = 1, 'l' consecutive = 1, 'o' consecutive = 1
    expect(result[0].score).toBe(7)
  })

  test("word boundary matches score higher than mid-word", () => {
    const boundary = fuzzyFilter(items("foo-bar"), "b")
    const midWord = fuzzyFilter(items("abc"), "b")
    expect(boundary).toHaveLength(1)
    expect(midWord).toHaveLength(1)
    // 'b' after '-' = word boundary = 2
    expect(boundary[0].score).toBe(2)
    // 'b' mid-word, not at start, not after boundary = 0
    expect(midWord[0].score).toBe(0)
  })

  test("consecutive matches get bonus", () => {
    const result = fuzzyFilter(items("abcdef"), "abc")
    expect(result).toHaveLength(1)
    // 'a' at pos 0 = 3, 'b' consecutive = 1, 'c' consecutive = 1
    expect(result[0].score).toBe(5)
    expect(result[0].positions).toEqual([0, 1, 2])
  })

  test("non-matching items are excluded", () => {
    const result = fuzzyFilter(items("apple", "banana", "cherry"), "xyz")
    expect(result).toHaveLength(0)
  })

  test("results sorted by score descending", () => {
    // "app" matches "apple" with start bonus; "zapping" matches but 'a' is at pos 1 (after 'z')
    const result = fuzzyFilter(items("zapping", "apple"), "app")
    expect(result).toHaveLength(2)
    // "apple": a(0)=3, p(1)=1, p(2)=1 = 5
    // "zapping": a(1)=0, p(2)=0, p(3)=1 = 1
    expect(result[0].item.text).toBe("apple")
    expect(result[1].item.text).toBe("zapping")
    expect(result[0].score).toBeGreaterThan(result[1].score)
  })

  test("case insensitive matching", () => {
    const result = fuzzyFilter(items("Hello World"), "hw")
    expect(result).toHaveLength(1)
    expect(result[0].item.text).toBe("Hello World")
  })

  test("preserves originalIndex", () => {
    const input = items("cherry", "apple", "banana")
    const result = fuzzyFilter(input, "a")
    // All three contain 'a' but originalIndex should be preserved
    for (const m of result) {
      expect(m.item).toBe(input[m.originalIndex])
    }
  })

  test("tracks match positions", () => {
    const result = fuzzyFilter(items("foobar"), "fb")
    expect(result).toHaveLength(1)
    expect(result[0].positions).toEqual([0, 3])
  })

  test("empty items returns empty", () => {
    const result = fuzzyFilter([], "test")
    expect(result).toHaveLength(0)
  })
})
