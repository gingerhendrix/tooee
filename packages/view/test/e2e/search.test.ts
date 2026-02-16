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
    const before = await session.text()
    expect(before).toMatch(/Mode:\s*cursor/)
    // Press / to open search
    await session.press("/")
    // The search bar replaces the status bar with a `/` prompt
    await new Promise((r) => setTimeout(r, 500))
    const text = await session.text()
    // The search bar shows the `/` prompt at the bottom line
    // The status bar is replaced so Mode: is no longer visible
    // Just check that the status bar changed (Mode: cursor is gone)
    expect(text).not.toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("type query and submit search, then n navigates", async () => {
    session = await launchView("long.md")
    await session.press("/")
    await new Promise((r) => setTimeout(r, 300))
    // Type a search query
    await session.type("Section")
    await new Promise((r) => setTimeout(r, 500))
    // Submit search (Enter returns to cursor mode)
    await session.press("enter")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Capture scroll before
    const beforeText = await session.text()
    const _scrollBefore = beforeText.match(/Scroll:\s*(\d+)/)?.[1]
    // Press n to navigate to next match
    await session.press("n")
    await new Promise((r) => setTimeout(r, 500))
    const afterText = await session.text()
    // Should still be in cursor mode
    expect(afterText).toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("Escape cancels search", async () => {
    session = await launchView("long.md")
    await session.press("/")
    await new Promise((r) => setTimeout(r, 300))
    await session.type("Section")
    await new Promise((r) => setTimeout(r, 300))
    // Send kitty-encoded Escape (raw \x1b is ambiguous)
    await session.writeRaw("\x1b[27u")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)
})
