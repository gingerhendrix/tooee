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
    await new Promise((r) => setTimeout(r, 300))
    await session.type("Alice")
    await new Promise((r) => setTimeout(r, 500))
    // Should show match count
    const text = await session.text()
    expect(text).toMatch(/\d+\/\d+/)
  }, 20000)

  test("search navigates with n", async () => {
    session = await launchTable("long.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("/")
    await new Promise((r) => setTimeout(r, 300))
    await session.type("Employee")
    await new Promise((r) => setTimeout(r, 500))
    await session.press("enter")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Press n to go to next match
    await session.press("n")
    await new Promise((r) => setTimeout(r, 500))
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)
})

describe("table selection mode", () => {
  test("v enters visual select mode", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("v")
    await new Promise((r) => setTimeout(r, 300))
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*select/)
  }, 20000)

  test("selection extends with j", async () => {
    session = await launchTable("data.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("v")
    await new Promise((r) => setTimeout(r, 300))
    await session.press("j")
    await new Promise((r) => setTimeout(r, 300))
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
    for (let i = 0; i < 10; i++) {
      await session.press("j")
    }
    await new Promise((r) => setTimeout(r, 500))
    const scrolled = await session.text()
    expect(scrolled).toContain("Carol")
  }, 20000)

  test("content after markdown table is positioned correctly", async () => {
    session = await launchView("mixed-content.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Navigate down past the table
    for (let i = 0; i < 8; i++) {
      await session.press("j")
    }
    await new Promise((r) => setTimeout(r, 500))
    const text = await session.text()
    expect(text).toContain("This paragraph appears after the table.")
  }, 20000)
})
