import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("marks rendering e2e (code content)", () => {
  test("code content with cursor shows cursor indicator in gutter", async () => {
    session = await launchView("long.ts")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Cursor should be active — the gutter sign (▸) is rendered via marks
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
    expect(text).toContain("▸")
  }, 20000)

  test("search highlights are visible when searching in code content", async () => {
    session = await launchView("long.ts")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Open search — retry until search bar appears
    for (let attempt = 0; attempt < 3; attempt++) {
      await session.press("/")
      await Bun.sleep(500)
      const check = await session.text()
      if (!check.match(/Mode:\s*cursor/)) break
    }
    // Type a search query that matches multiple lines
    await session.type("function")
    // Submit search
    await session.press("enter")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Move to next match so the first match line shows ● instead of cursor ▸
    // (cursor sign has higher priority and overrides the search sign)
    await session.press("n")
    await Bun.sleep(200)
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
    // Search match signs (●) should be visible on non-cursor match lines
    expect(text).toContain("●")
  }, 20000)

  test("selection highlighting works in code content", async () => {
    session = await launchView("long.ts")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Enter select mode
    await session.press("v")
    await session.waitForText(/Mode:\s*select/, { timeout: 5000 })
    // Extend selection down a few lines
    await session.press("j")
    await session.press("j")
    await session.press("j")
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*select/)
    // Selection should show "Selected:" count in status bar
    expect(text).toMatch(/Selected:\s*\d+/)
  }, 20000)

  test("cursor moves correctly via marks in code content", async () => {
    session = await launchView("long.ts")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.waitForText(/Cursor:\s*0/, { timeout: 5000 })
    // Move cursor down
    await session.press("j")
    await Bun.sleep(200)
    const text = await session.text()
    // Cursor should have moved from 0
    expect(text).toMatch(/Cursor:\s*1/)
  }, 20000)
})
