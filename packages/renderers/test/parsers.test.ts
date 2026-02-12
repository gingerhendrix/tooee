import { describe, test, expect } from "bun:test"
import { parseCSV, parseTSV, parseJSON, detectFormat, parseAuto } from "../src/parsers.ts"

describe("parseCSV", () => {
  test("basic CSV", () => {
    const result = parseCSV("name,age,city\nAlice,30,London\nBob,25,Paris")
    expect(result.columns.map((column) => column.header)).toEqual(["name", "age", "city"])
    expect(result.rows).toEqual([
      { name: "Alice", age: "30", city: "London" },
      { name: "Bob", age: "25", city: "Paris" },
    ])
  })

  test("quoted fields", () => {
    const result = parseCSV(
      'name,bio\nAlice,"Likes ""coding"" and tea"\nBob,"Lives in Paris, France"',
    )
    expect(result.columns.map((column) => column.header)).toEqual(["name", "bio"])
    expect(result.rows[0]).toEqual({ name: "Alice", bio: 'Likes "coding" and tea' })
    expect(result.rows[1]).toEqual({ name: "Bob", bio: "Lives in Paris, France" })
  })

  test("mixed quoted and unquoted", () => {
    const result = parseCSV('a,b,c\n1,"two",3\nfour,5,"six"')
    expect(result.rows).toEqual([
      { a: "1", b: "two", c: "3" },
      { a: "four", b: "5", c: "six" },
    ])
  })

  test("empty input", () => {
    const result = parseCSV("")
    expect(result.columns).toEqual([])
    expect(result.rows).toEqual([])
  })
})

describe("parseTSV", () => {
  test("basic TSV", () => {
    const result = parseTSV("name\tage\tcity\nAlice\t30\tLondon\nBob\t25\tParis")
    expect(result.columns.map((column) => column.header)).toEqual(["name", "age", "city"])
    expect(result.rows).toEqual([
      { name: "Alice", age: "30", city: "London" },
      { name: "Bob", age: "25", city: "Paris" },
    ])
  })

  test("empty input", () => {
    const result = parseTSV("")
    expect(result.columns).toEqual([])
    expect(result.rows).toEqual([])
  })
})

describe("parseJSON", () => {
  test("array of objects", () => {
    const result = parseJSON('[{"name":"Alice","age":30},{"name":"Bob","age":25}]')
    expect(result.columns.map((column) => column.key)).toEqual(["name", "age"])
    expect(result.rows).toEqual([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ])
  })

  test("empty array", () => {
    const result = parseJSON("[]")
    expect(result.columns).toEqual([])
    expect(result.rows).toEqual([])
  })

  test("handles null values", () => {
    const result = parseJSON('[{"a":1,"b":null}]')
    expect(result.rows).toEqual([{ a: 1, b: "" }])
  })
})

describe("detectFormat", () => {
  test("detects JSON", () => {
    expect(detectFormat('[{"a":1}]')).toBe("json")
  })

  test("detects TSV", () => {
    expect(detectFormat("a\tb\tc\n1\t2\t3")).toBe("tsv")
  })

  test("detects CSV", () => {
    expect(detectFormat("a,b,c\n1,2,3")).toBe("csv")
  })

  test("returns unknown for plain text", () => {
    expect(detectFormat("hello world")).toBe("unknown")
  })
})

describe("parseAuto", () => {
  test("auto-detects CSV", () => {
    const result = parseAuto("name,age\nAlice,30")
    expect(result.format).toBe("csv")
    expect(result.columns.map((column) => column.header)).toEqual(["name", "age"])
  })

  test("auto-detects JSON", () => {
    const result = parseAuto('[{"name":"Alice"}]')
    expect(result.format).toBe("json")
    expect(result.columns.map((column) => column.header)).toEqual(["name"])
  })

  test("auto-detects TSV", () => {
    const result = parseAuto("name\tage\nAlice\t30")
    expect(result.format).toBe("tsv")
    expect(result.columns.map((column) => column.header)).toEqual(["name", "age"])
  })
})
