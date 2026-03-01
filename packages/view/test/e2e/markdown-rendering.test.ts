import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("markdown code block rendering", () => {
  test("multi-line code block shows all lines", async () => {
    session = await launchView("mixed-content.md")
    const text = await session.text()
    // All 5 lines of the Python code block should be visible
    expect(text).toContain("def greet(name):")
    expect(text).toContain('print(f"Hello, {name}!")')
    expect(text).toContain("return True")
    expect(text).toContain("greet")
  }, 20000)

  test("paragraph after code block is visible", async () => {
    session = await launchView("mixed-content.md")
    const text = await session.text()
    expect(text).toContain("This paragraph appears after the code block.")
  }, 20000)

  test("code block has proper borders", async () => {
    session = await launchView("mixed-content.md")
    const text = await session.text()
    // Top and bottom box-drawing borders should be present
    expect(text).toContain("\u250c") // top-left corner
    expect(text).toContain("\u2514") // bottom-left corner
  }, 20000)
})

describe("markdown table rendering", () => {
  test("table shows all rows", async () => {
    session = await launchView("mixed-content.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Header should be visible initially
    const initial = await session.text()
    expect(initial).toContain("Score")
    expect(initial).toContain("Grade")
    expect(initial).toContain("Alice")
    // Scroll down to see remaining rows (table with cellPadding takes more vertical space)
    for (let i = 0; i < 6; i++) {
      await session.press("j")
      await new Promise((r) => setTimeout(r, 200))
    }
    await new Promise((r) => setTimeout(r, 300))
    const text = await session.text()
    expect(text).toContain("Bob")
    expect(text).toContain("Carol")
  }, 20000)

  test("paragraph after table is visible after scrolling", async () => {
    session = await launchView("mixed-content.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Scroll down past the table to see the paragraph after it
    await session.type("j".repeat(8))
    const text = await session.text()
    expect(text).toContain("This paragraph appears after the table.")
  }, 20000)
})

describe("mixed content positioning", () => {
  test("blocks from heading through table render in correct order", async () => {
    session = await launchView("mixed-content.md")
    const text = await session.text()
    const lines = text.split("\n")

    // Find key content lines visible in the initial viewport
    const headingLine = lines.findIndex((l) => l.includes("Mixed Content Test"))
    const codeStartLine = lines.findIndex((l) => l.includes("def greet"))
    const afterCodeLine = lines.findIndex((l) => l.includes("paragraph appears after the code"))
    const tableLine = lines.findIndex((l) => l.includes("Alice"))

    // All content in the initial viewport should be found and in order
    expect(headingLine).toBeGreaterThanOrEqual(0)
    expect(codeStartLine).toBeGreaterThan(headingLine)
    expect(afterCodeLine).toBeGreaterThan(codeStartLine)
    expect(tableLine).toBeGreaterThan(afterCodeLine)
  }, 20000)

  test("after-table content is reachable by scrolling", async () => {
    session = await launchView("mixed-content.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Navigate down to see content after the table
    await session.type("j".repeat(10))
    const text = await session.text()
    expect(text).toContain("paragraph appears after the table")
  }, 20000)

  test("second code block also renders correctly", async () => {
    session = await launchView("mixed-content.md")
    // Navigate down to see second code block
    await session.type("j".repeat(15))
    const text = await session.text()
    expect(text).toContain("simple line one")
    expect(text).toContain("simple line two")
    expect(text).toContain("simple line three")
  }, 20000)

  test("final paragraph is reachable", async () => {
    session = await launchView("mixed-content.md")
    // Jump to end
    await session.press(["shift", "g"])
    await session.waitForText("Final paragraph", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Final paragraph at the end of the document.")
  }, 20000)
})

describe("scroll isolation on code blocks", () => {
  test("scrolling over code block moves document not code content", async () => {
    session = await launchView("mixed-content.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    // Capture initial state - code block should be visible
    const before = await session.text()
    expect(before).toContain("def greet(name):")
    expect(before).toContain("return True")

    // Scroll down using mouse wheel at a position within the code block area
    // The code block is roughly at rows 5-10, column 30
    await session.scrollDown(3, 30, 7)

    const after = await session.text()

    // If the code block is still in view, all its lines should be intact
    // (not partially scrolled away due to scroll leak)
    if (after.includes("def greet")) {
      expect(after).toContain("return True")
      expect(after).toContain("greet")
    }
    // If the code block scrolled out of view entirely, that's correct -
    // the document scrolled as expected
  }, 20000)
})

describe("gutter line numbers with mixed content", () => {
  test("line numbers account for code block and table as single blocks", async () => {
    session = await launchView("mixed-content.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    const lines = text.split("\n")

    // The heading should be on block 1
    const headingLine = lines.find((l) => l.includes("Mixed Content Test"))
    expect(headingLine).toBeDefined()
    expect(headingLine).toMatch(/1.*Mixed Content Test/)

    // The intro paragraph should be block 2
    const introLine = lines.find((l) => l.includes("introductory paragraph"))
    expect(introLine).toBeDefined()
    expect(introLine).toMatch(/2.*introductory paragraph/)
  }, 20000)
})
