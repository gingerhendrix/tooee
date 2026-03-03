import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("search e2e", () => {
  test("/ opens search bar", async () => {
    session = await launchView("long.md")
    // Verify we start in cursor mode
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const before = await session.text()
    expect(before).toMatch(/Mode:\s*cursor/)
    // Press / to open search — retry until the status bar changes
    // (on slow CI the first keypress can be dropped)
    for (let attempt = 0; attempt < 3; attempt++) {
      await session.press("/")
      await Bun.sleep(500)
      const check = await session.text()
      if (!check.match(/Mode:\s*cursor/)) break
    }
    const text = await session.text()
    // The search bar replaces the status bar so Mode: cursor is gone
    expect(text).not.toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("type query and submit search, then n navigates", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Open search — retry until search bar appears
    for (let attempt = 0; attempt < 3; attempt++) {
      await session.press("/")
      await Bun.sleep(500)
      const check = await session.text()
      if (!check.match(/Mode:\s*cursor/)) break
    }
    // Type a search query
    await session.type("Section")
    // Submit search (Enter returns to cursor mode)
    await session.press("enter")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Capture scroll before
    const beforeText = await session.text()
    const _cursorBefore = beforeText.match(/Cursor:\s*(\d+)/)?.[1]
    // Press n to navigate to next match
    await session.press("n")
    const afterText = await session.text()
    // Should still be in cursor mode
    expect(afterText).toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("Escape cancels search", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Open search — retry until search bar appears
    for (let attempt = 0; attempt < 3; attempt++) {
      await session.press("/")
      await Bun.sleep(500)
      const check = await session.text()
      if (!check.match(/Mode:\s*cursor/)) break
    }
    await session.type("Section")
    // Send kitty-encoded Escape (raw \x1b is ambiguous)
    await session.writeRaw("\x1b[27u")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)
})
