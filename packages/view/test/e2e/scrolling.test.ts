import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"
import { launchTable } from "./table-helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

function extractCursor(text: string): number {
  const match = text.match(/Cursor:\s*(\d+)/)
  return match ? parseInt(match[1], 10) : -1
}

describe("markdown scrolling", () => {
  test("cursor down past viewport scrolls content", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    // Section 2 should be visible initially (use "section 2." to avoid matching "section 20")
    const before = await session.text()
    expect(before).toMatch(/section 2\./i)

    // Press j enough times to move cursor past viewport (24 rows, ~22 viewport)
    for (let i = 0; i < 30; i++) {
      await session.press("j")
    }
    await new Promise((r) => setTimeout(r, 500))

    // After scrolling down, early sections should no longer be visible
    const after = await session.text()
    expect(after).not.toMatch(/section 2\./i)
  }, 20000)

  test("gg returns to top", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    // Jump to end to set up a "not at top" state
    await session.press(["shift", "g"])
    await session.waitForText("Section 70", { timeout: 5000 })

    // gg to top — Section 2 should reappear
    await session.type("gg")
    await session.waitForText(/section 2\./i, { timeout: 5000 })
    expect(await session.text()).toMatch(/section 2\./i)
  }, 20000)

  test("G scrolls to end", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    await session.press(["shift", "g"])
    await session.waitForText("Section 70", { timeout: 5000 })

    const text = await session.text()
    expect(text).toContain("Section 70")
    expect(text).not.toMatch(/section 2\./i)
  }, 20000)
})

describe("code scrolling", () => {
  test("cursor down past viewport increases scroll", async () => {
    session = await launchView("long.ts")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    // Press j enough times to go past viewport
    for (let i = 0; i < 30; i++) {
      await session.press("j")
    }
    await new Promise((r) => setTimeout(r, 500))

    const cursor = extractCursor(await session.text())
    expect(cursor).toBeGreaterThan(0)
  }, 20000)

  test("gg returns cursor to 0", async () => {
    session = await launchView("long.ts")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    // Jump to end to set up a "not at top" state
    await session.press(["shift", "g"])
    await session.waitForText(/Cursor:\s*[1-9]/, { timeout: 5000 })

    // gg to top
    await session.type("gg")
    await session.waitForText(/Cursor:\s*0/, { timeout: 5000 })
    expect(extractCursor(await session.text())).toBe(0)
  }, 20000)

  test("G moves cursor to end", async () => {
    session = await launchView("long.ts")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    await session.press(["shift", "g"])
    await session.waitForText(/Cursor:\s*[1-9]/, { timeout: 5000 })

    const cursor = extractCursor(await session.text())
    expect(cursor).toBeGreaterThan(0)
  }, 20000)
})

describe("table scrolling", () => {
  test("cursor down past viewport scrolls content", async () => {
    session = await launchTable("long.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    // Employee 1 should be visible initially
    const before = await session.text()
    expect(before).toMatch(/Employee 1\b/)

    // Press j enough times to go past viewport
    for (let i = 0; i < 30; i++) {
      await session.press("j")
    }
    await new Promise((r) => setTimeout(r, 500))

    // After scrolling, early rows should be gone
    const after = await session.text()
    expect(after).not.toMatch(/Employee 1\b/)
  }, 20000)

  test("gg returns to top", async () => {
    session = await launchTable("long.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    // Jump to end to set up a "not at top" state
    await session.press(["shift", "g"])
    await session.waitForText(/Cursor:\s*59/, { timeout: 5000 })

    // gg to top
    await session.type("gg")
    await session.waitForText(/Employee 1\b/, { timeout: 5000 })
    expect(await session.text()).toMatch(/Employee 1\b/)
  }, 20000)

  test("gg preserves table header visibility", async () => {
    session = await launchTable("long.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    // Header columns should be visible initially
    const initial = await session.text()
    expect(initial).toContain("name")
    expect(initial).toContain("email")

    // Jump to end past the header
    await session.press(["shift", "g"])
    await session.waitForText(/Cursor:\s*59/, { timeout: 5000 })

    // gg back to top
    await session.type("gg")
    await session.waitForText(/Employee 1\b/, { timeout: 5000 })

    // Header columns must still be visible after returning to top
    const after = await session.text()
    expect(after).toContain("name")
    expect(after).toContain("email")
  }, 20000)

  test("G scrolls to end", async () => {
    session = await launchTable("long.csv")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })

    await session.press(["shift", "g"])
    // Wait for cursor to reach the last row (0-indexed: 59)
    await session.waitForText(/Cursor:\s*59/, { timeout: 5000 })

    const text = await session.text()
    // The viewport should show rows near the end of the table
    // and early rows should have scrolled out of view
    expect(text).not.toMatch(/Employee 1\b/)
    expect(text).toMatch(/Cursor:\s*59/)
  }, 20000)
})
