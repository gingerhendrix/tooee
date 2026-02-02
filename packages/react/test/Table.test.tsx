import { testRender } from "@opentui/react/test-utils"
import { test, expect, describe, afterEach } from "bun:test"
import { ThemeSwitcherProvider } from "@tooee/react"
import { Table } from "../src/components/Table.tsx"
import { computeColumnWidths, truncate, isNumeric } from "../src/components/Table.tsx"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("Table component", () => {
  test("renders headers and rows", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <Table
          headers={["Name", "Age", "City"]}
          rows={[
            ["Alice", "30", "London"],
            ["Bob", "25", "Paris"],
          ]}
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
          headers={["ID", "Description"]}
          rows={[
            ["1", "A short description"],
            ["2", "Another description that is longer"],
          ]}
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
          headers={["Col"]}
          rows={[["This is a very long string that should be truncated when displayed"]]}
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
          headers={["Name", "Score"]}
          rows={[
            ["Alice", "100"],
            ["Bob", "95"],
            ["Carol", "87"],
          ]}
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
          headers={["Name", "Age", "City"]}
          rows={[
            ["Alice", "30", "London"],
            ["Bob", "25", "Paris"],
            ["Carol", "28", "Berlin"],
          ]}
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

describe("Table utilities", () => {
  test("computeColumnWidths fits within maxWidth", () => {
    const widths = computeColumnWidths(
      ["Name", "Description"],
      [["Alice", "A very long description that exceeds the threshold"]],
      40,
    )
    const total = widths.reduce((a, b) => a + b, 0) + widths.length + 1
    expect(total).toBeLessThanOrEqual(40)
  })

  test("computeColumnWidths uses natural widths when they fit", () => {
    const widths = computeColumnWidths(
      ["A", "B"],
      [["xx", "yy"]],
      80,
    )
    // Natural width = max(header, content) + 2 padding = 4 each
    expect(widths[0]).toBe(4)
    expect(widths[1]).toBe(4)
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
