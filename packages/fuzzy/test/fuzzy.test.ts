import { test, expect, describe } from "bun:test"
import { fuzzyMatch, fuzzyMatchPositions } from "../src/fuzzy.js"

describe("fuzzyMatch", () => {
  test("returns null for non-matching text", () => {
    expect(fuzzyMatch("xyz", "hello")).toBeNull()
  })

  test("returns score for matching text", () => {
    // 'h' at pos 0 = 3, 'e' consecutive = 1, 'l' consecutive = 1, 'l' consecutive = 1, 'o' consecutive = 1
    expect(fuzzyMatch("hello", "hello")).toBe(7)
  })

  test("case insensitive", () => {
    expect(fuzzyMatch("hw", "Hello World")).not.toBeNull()
  })

  test("word boundary bonus", () => {
    // 'b' after '-' = 2
    expect(fuzzyMatch("b", "foo-bar")).toBe(2)
    // 'b' mid-word = 0
    expect(fuzzyMatch("b", "abc")).toBe(0)
  })

  test("start of string bonus", () => {
    expect(fuzzyMatch("a", "abc")).toBe(3)
  })

  test("consecutive bonus", () => {
    // 'a' at 0 = 3, 'b' consecutive = 1, 'c' consecutive = 1
    expect(fuzzyMatch("abc", "abcdef")).toBe(5)
  })
})

describe("fuzzyMatchPositions", () => {
  test("returns null for non-matching text", () => {
    expect(fuzzyMatchPositions("xyz", "hello")).toBeNull()
  })

  test("returns positions and score", () => {
    const result = fuzzyMatchPositions("fb", "foobar")
    expect(result).not.toBeNull()
    expect(result!.positions).toEqual([0, 3])
    expect(result!.score).toBe(3) // 'f' at pos 0 = 3
  })

  test("exact match positions", () => {
    const result = fuzzyMatchPositions("abc", "abcdef")
    expect(result).not.toBeNull()
    expect(result!.positions).toEqual([0, 1, 2])
    expect(result!.score).toBe(5)
  })

  test("case insensitive", () => {
    const result = fuzzyMatchPositions("hw", "Hello World")
    expect(result).not.toBeNull()
    expect(result!.positions).toEqual([0, 6])
  })

  test("empty query matches everything with score 0", () => {
    const result = fuzzyMatchPositions("", "anything")
    expect(result).not.toBeNull()
    expect(result!.score).toBe(0)
    expect(result!.positions).toEqual([])
  })
})
