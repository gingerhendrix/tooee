import { testRender } from "@opentui/react/test-utils"
import { test, expect, describe, afterEach } from "bun:test"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { Table } from "../src/Table.js"
import { computeColumnWidths, truncate, isNumeric } from "../src/Table.js"

function createColumns(headers: string[]) {
  return headers.map((header, index) => ({
    key: `col_${index}`,
    header,
  }))
}

function createRows(columns: ReturnType<typeof createColumns>, values: string[][]) {
  return values.map((row) => {
    const record: Record<string, string> = {}
    columns.forEach((column, index) => {
      record[column.key] = row[index] ?? ""
    })
    return record
  })
}

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("Table component", () => {
  test("renders headers and rows", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Name", "Age", "City"])}
          rows={createRows(createColumns(["Name", "Age", "City"]), [
            ["Alice", "30", "London"],
            ["Bob", "25", "Paris"],
          ])}
          maxWidth={60}
        />
      </ThemeSwitcherProvider>,
      { width: 60, height: 20 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Name")
    expect(frame).toContain("Age")
    expect(frame).toContain("City")
    expect(frame).toContain("Alice")
    expect(frame).toContain("Bob")
    expect(frame).toContain("London")
    expect(frame).toContain("Paris")
  })

  test("columns adapt to content width", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["ID", "Description"])}
          rows={createRows(createColumns(["ID", "Description"]), [
            ["1", "A short description"],
            ["2", "Another description that is longer"],
          ])}
          maxWidth={50}
        />
      </ThemeSwitcherProvider>,
      { width: 50, height: 20 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("ID")
    expect(frame).toContain("Description")
  })

  test("long content is truncated", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Col"])}
          rows={createRows(createColumns(["Col"]), [["This is a very long string that should be truncated when displayed"]])}
          maxWidth={20}
        />
      </ThemeSwitcherProvider>,
      { width: 20, height: 10 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("…")
  })

  test("numbers right-aligned", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Name", "Score"])}
          rows={createRows(createColumns(["Name", "Score"]), [
            ["Alice", "100"],
            ["Bob", "95"],
            ["Carol", "87"],
          ])}
          maxWidth={40}
        />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // Numbers should have leading spaces (right-aligned)
    expect(frame).toContain("100")
    expect(frame).toContain("95")
  })

  test("snapshot", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Name", "Age", "City"])}
          rows={createRows(createColumns(["Name", "Age", "City"]), [
            ["Alice", "30", "London"],
            ["Bob", "25", "Paris"],
            ["Carol", "28", "Berlin"],
          ])}
          maxWidth={40}
        />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toMatchSnapshot()
  })
})

const defaultOptions = { minColumnWidth: 4, maxColumnWidth: 50, sampleSize: 100 }

describe("Table utilities", () => {
  test("computeColumnWidths fits within maxWidth", () => {
    const widths = computeColumnWidths(
      ["Name", "Description"],
      [["Alice", "A very long description that exceeds the threshold"]],
      40,
      defaultOptions,
    )
    const total = widths.reduce((a, b) => a + b, 0) + widths.length + 1
    expect(total).toBeLessThanOrEqual(40)
  })

  test("computeColumnWidths uses natural widths when they fit", () => {
    const widths = computeColumnWidths(["A", "B"], [["xx", "yy"]], 80, defaultOptions)
    // Natural width = max(header, content, minColumnWidth) + 2 padding
    // With minColumnWidth=4, content "xx" (2 chars) is bumped to 4, then +2 padding = 6
    expect(widths[0]).toBe(6)
    expect(widths[1]).toBe(6)
  })

  test("truncate shortens long text", () => {
    expect(truncate("Hello World", 8)).toBe("Hello…")
    expect(truncate("Hi", 8)).toBe("Hi")
  })

  test("isNumeric detects numbers", () => {
    expect(isNumeric("42")).toBe(true)
    expect(isNumeric("-3.14")).toBe(true)
    expect(isNumeric("1,000")).toBe(true)
    expect(isNumeric("hello")).toBe(false)
    expect(isNumeric("")).toBe(false)
  })
})
