import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchTable } from "./table-helpers.js"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("table text wrapping", () => {
  test("long content wraps instead of truncating", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    // No truncation ellipsis
    expect(text).not.toContain("\u2026")
    // All data visible
    expect(text).toContain("Alice")
    expect(text).toContain("Charlie")
  }, 20000)
})

describe("table search", () => {
  test("search finds matches in table data", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Open search
    await session.press("/")
    await session.type("Alice")
    // Should show match count
    await session.waitForText(/\d+\/\d+/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/\d+\/\d+/)
  }, 20000)

  test("search navigates with n", async () => {
    session = await launchTable("long.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("/")
    await session.type("Employee")
    await session.waitForText(/\d+\/\d+/, { timeout: 5000 })
    await session.press("enter")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Press n to go to next match
    await session.press("n")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)
})

describe("table selection mode", () => {
  test("v enters visual select mode", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("v")
    await session.waitForText(/Mode:\s*select/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*select/)
  }, 20000)

  test("selection extends with j", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("v")
    await session.waitForText(/Mode:\s*select/, { timeout: 5000 })
    await session.press("j")
    await session.waitForText(/Selected\s*:?\s*2/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*select/)
    expect(text).toMatch(/Selected\s*:?\s*2/)
  }, 20000)
})

describe("markdown inline table", () => {
  test("markdown table has native borders", async () => {
    session = await launchView("mixed-content.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    // TextTableRenderable renders proper box-drawing borders
    expect(text).toContain("\u2502") // vertical bar
    expect(text).toContain("\u2500") // horizontal line
    // Table header and first data row should be visible
    expect(text).toContain("Name")
    expect(text).toContain("Alice")
    // Scroll down to see more table rows
    await session.type("j".repeat(10))
    await session.waitForText("Carol", { timeout: 5000 })
    const scrolled = await session.text()
    expect(scrolled).toContain("Carol")
  }, 20000)

  test("content after markdown table is positioned correctly", async () => {
    session = await launchView("mixed-content.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Navigate down past the table
    await session.type("j".repeat(8))
    await session.waitForText("This paragraph appears after the table.", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("This paragraph appears after the table.")
  }, 20000)
})
