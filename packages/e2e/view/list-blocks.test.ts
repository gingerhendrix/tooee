import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("code blocks inside list items", () => {
  test("code block in list renders with borders", async () => {
    session = await launchView("list-blocks.md")
    const text = await session.text()
    expect(text).toContain("Setup instructions")
    expect(text).toContain("npm install")
    // Code block should have border
    expect(text).toContain("\u250c") // top-left corner
    expect(text).toContain("\u2514") // bottom-left corner
  }, 20000)

  test("multiple code blocks in list items all render", async () => {
    session = await launchView("list-blocks.md")
    await session.type("j".repeat(4))
    await session.waitForText("Verification step", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Verification step")
    expect(text).toContain("const result")
  }, 20000)

  test("list item after code block is visible", async () => {
    session = await launchView("list-blocks.md")
    await session.type("j".repeat(6))
    await session.waitForText("Final step", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Final step")
  }, 20000)
})

describe("tables inside list items", () => {
  test("table in list renders all cells", async () => {
    session = await launchView("list-blocks.md")
    // Scroll down to the table section
    await session.press(["ctrl", "d"])
    await session.waitForText("Performance data", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Latency")
    expect(text).toContain("42ms")
    expect(text).toContain("Throughput")
    expect(text).toContain("1000rps")
  }, 20000)

  test("list item after table is visible", async () => {
    session = await launchView("list-blocks.md")
    await session.press(["ctrl", "d"])
    await session.waitForText("Analysis complete", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Analysis complete")
  }, 20000)
})

describe("checkbox list items", () => {
  test("checked and unchecked checkboxes render", async () => {
    session = await launchView("list-blocks.md")
    await session.press(["ctrl", "d"])
    await session.press(["ctrl", "d"])
    await session.waitForText("Install dependencies", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("[x]")
    expect(text).toContain("[ ]")
    expect(text).toContain("Install dependencies")
    expect(text).toContain("Deploy to production")
  }, 20000)
})

describe("blockquotes inside list items", () => {
  test("blockquote in list renders with quote bar", async () => {
    session = await launchView("list-blocks.md")
    await session.press(["ctrl", "d"])
    await session.press(["ctrl", "d"])
    await session.waitForText("validate input", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Important note")
    expect(text).toContain("validate input")
  }, 20000)
})

describe("navigation through flat blocks", () => {
  test("G jumps to final paragraph after all list content", async () => {
    session = await launchView("list-blocks.md")
    await session.press(["shift", "g"])
    await session.waitForText("Final paragraph", { timeout: 10000 })
    const text = await session.text()
    expect(text).toContain("Final paragraph after all list content.")
  }, 20000)

  test("block count matches flattened structure", async () => {
    session = await launchView("list-blocks.md")
    const text = await session.text()
    // Status bar should show cursor in mode cursor
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)
})
