import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("marks rendering e2e (markdown content)", () => {
  test("markdown content with cursor shows cursor indicator in gutter", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
    // Cursor sign (▸) rendered via marks
    expect(text).toContain("▸")
  }, 20000)

  test("search highlights are visible when searching in markdown content", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Open search
    for (let attempt = 0; attempt < 3; attempt++) {
      await session.press("/")
      await Bun.sleep(500)
      const check = await session.text()
      if (!check.match(/Mode:\s*cursor/)) break
    }
    // Type a search query that matches multiple blocks
    await session.type("the")
    await session.press("enter")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    // Search match signs (●) rendered via marks
    expect(text).toContain("●")
  }, 20000)

  test("cursor moves correctly via marks in markdown content", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.waitForText(/Cursor:\s*0/, { timeout: 5000 })
    // Move cursor down
    await session.press("j")
    await Bun.sleep(200)
    const text = await session.text()
    expect(text).toMatch(/Cursor:\s*1/)
  }, 20000)

  test("selection highlighting works in markdown content", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Enter select mode
    await session.press("v")
    await session.waitForText(/Mode:\s*select/, { timeout: 5000 })
    // Extend selection
    await session.press("j")
    await session.press("j")
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*select/)
    // Status bar may truncate spacing — match flexibly
    expect(text).toMatch(/Selected.*\d+/)
  }, 20000)

  test("toggle marking works in markdown content", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Toggle current block with tab
    await session.press("tab")
    await Bun.sleep(200)
    const text = await session.text()
    expect(text).toMatch(/Selected.*1/)
  }, 20000)
})
