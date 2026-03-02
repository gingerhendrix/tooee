import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, describe, afterEach } from "bun:test"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { Table } from "../src/Table.js"
import { computeColumnWidths, isNumeric } from "../src/Table.js"

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

  test("long content wraps instead of truncating", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Col"])}
          rows={createRows(createColumns(["Col"]), [["This is a very long string that should wrap when displayed"]])}
          maxWidth={35}
        />
      </ThemeSwitcherProvider>,
      { width: 35, height: 20 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // Content should wrap, not truncate -- no ellipsis
    expect(frame).not.toContain("\u2026")
    // The full text should be present across multiple lines
    expect(frame).toContain("This")
    expect(frame).toContain("long")
    expect(frame).toContain("wrap")
  })

  test("renders header underline", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Name", "Age"])}
          rows={createRows(createColumns(["Name", "Age"]), [
            ["Alice", "30"],
          ])}
          maxWidth={40}
        />
      </ThemeSwitcherProvider>,
      { width: 40, height: 10 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // Should have horizontal line separator under header
    expect(frame).toContain("\u2500")
  })

  test("renders without box-drawing borders", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Name", "Age"])}
          rows={createRows(createColumns(["Name", "Age"]), [
            ["Alice", "30"],
          ])}
          maxWidth={40}
        />
      </ThemeSwitcherProvider>,
      { width: 40, height: 10 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // No box-drawing vertical borders or corners
    expect(frame).not.toContain("\u2502") // │
    expect(frame).not.toContain("\u250c") // ┌
    expect(frame).not.toContain("\u2510") // ┐
    expect(frame).not.toContain("\u2514") // └
    expect(frame).not.toContain("\u2518") // ┘
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
    expect(frame).toContain(" 95")
    expect(frame).toContain(" 87")
  })

  test("renders gutter with line numbers", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Name", "Age"])}
          rows={createRows(createColumns(["Name", "Age"]), [
            ["Alice", "30"],
            ["Bob", "25"],
            ["Carol", "28"],
          ])}
          maxWidth={40}
        />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // Line numbers should appear in the gutter for each data row
    expect(frame).toContain("1")
    expect(frame).toContain("2")
    expect(frame).toContain("3")
    // Data should still be present
    expect(frame).toContain("Alice")
    expect(frame).toContain("Bob")
    expect(frame).toContain("Carol")
  })

  test("hides line numbers when showLineNumbers={false}", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Name"])}
          rows={createRows(createColumns(["Name"]), [
            ["Alice"],
            ["Bob"],
          ])}
          showLineNumbers={false}
          maxWidth={40}
        />
      </ThemeSwitcherProvider>,
      { width: 40, height: 10 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // Data should still render
    expect(frame).toContain("Alice")
    expect(frame).toContain("Bob")
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

describe("fill mode", () => {
  test("fill mode expands columns to fill available width", () => {
    const widths = computeColumnWidths(
      ["A", "B"],
      [["xx", "yy"]],
      80,
      { ...defaultOptions, columnWidthMode: "fill" },
    )
    const total = widths.reduce((a, b) => a + b, 0)
    expect(total).toBe(80)
  })

  test("fill mode distributes extra space proportionally", () => {
    const widths = computeColumnWidths(
      ["A", "B"],
      [["xx", "yy"]],
      80,
      { ...defaultOptions, columnWidthMode: "fill" },
    )
    // Both columns should get equal extra space (same natural width)
    expect(widths[0]).toBe(widths[1])
  })

  test("content mode (default) does not expand columns", () => {
    const widths = computeColumnWidths(
      ["A", "B"],
      [["xx", "yy"]],
      80,
      defaultOptions,
    )
    const total = widths.reduce((a, b) => a + b, 0)
    expect(total).toBeLessThan(80)
  })

  test("fill mode has no effect when columns exceed available width", () => {
    const widths = computeColumnWidths(
      ["Name", "Very Long Description Header"],
      [["Alice", "A very long description that exceeds the threshold"]],
      30,
      { ...defaultOptions, columnWidthMode: "fill" },
    )
    const total = widths.reduce((a, b) => a + b, 0)
    expect(total).toBeLessThanOrEqual(30)
  })

  test("fill mode table render", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          columns={createColumns(["Name", "Age"])}
          rows={createRows(createColumns(["Name", "Age"]), [
            ["Alice", "30"],
            ["Bob", "25"],
          ])}
          maxWidth={60}
          columnWidthMode="fill"
        />
      </ThemeSwitcherProvider>,
      { width: 60, height: 10 },
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Alice")
    expect(frame).toContain("Bob")
    expect(frame).toMatchSnapshot()
  })
})

describe("Table utilities", () => {
  test("computeColumnWidths fits within maxWidth", () => {
    const widths = computeColumnWidths(
      ["Name", "Description"],
      [["Alice", "A very long description that exceeds the threshold"]],
      40,
      defaultOptions,
    )
    // No border overhead -- total column widths should fit within maxWidth
    const total = widths.reduce((a, b) => a + b, 0)
    expect(total).toBeLessThanOrEqual(40)
  })

  test("computeColumnWidths uses natural widths when they fit", () => {
    const widths = computeColumnWidths(["A", "B"], [["xx", "yy"]], 80, defaultOptions)
    // Natural width = max(header, content, minColumnWidth) + 2 padding
    // With minColumnWidth=4, content "xx" (2 chars) is bumped to 4, then +2 padding = 6
    expect(widths[0]).toBe(6)
    expect(widths[1]).toBe(6)
  })

  test("isNumeric detects numbers", () => {
    expect(isNumeric("42")).toBe(true)
    expect(isNumeric("-3.14")).toBe(true)
    expect(isNumeric("1,000")).toBe(true)
    expect(isNumeric("1,234")).toBe(true)
    expect(isNumeric("-5")).toBe(true)
    expect(isNumeric("3.14")).toBe(true)
    expect(isNumeric("  42  ")).toBe(true)
    expect(isNumeric("hello")).toBe(false)
    expect(isNumeric("")).toBe(false)
    // Currency symbols are intentionally not numeric -- they shouldn't trigger right-alignment
    expect(isNumeric("$100")).toBe(false)
    expect(isNumeric("100%")).toBe(false)
    expect(isNumeric("abc123")).toBe(false)
  })
})
