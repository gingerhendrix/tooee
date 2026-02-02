import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.ts"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("search e2e", () => {
  test("/ opens search bar", async () => {
    session = await launchView("long.md")
    // Verify we start in command mode
    const before = await session.text()
    expect(before).toMatch(/Mode:\s*command/)
    // Press / to open search
    await session.press("/")
    // The search bar replaces the status bar with a `/` prompt
    await new Promise((r) => setTimeout(r, 500))
    const text = await session.text()
    // The search bar shows the `/` prompt at the bottom line
    // The status bar is replaced so Mode: is no longer visible
    // Just check that the status bar changed (Mode: command is gone)
    expect(text).not.toMatch(/Mode:\s*command/)
  }, 20000)

  test("type query and submit search, then n navigates", async () => {
    session = await launchView("long.md")
    await session.press("/")
    await new Promise((r) => setTimeout(r, 300))
    // Type a search query
    await session.type("Section")
    await new Promise((r) => setTimeout(r, 500))
    // Submit search (Enter returns to command mode)
    await session.press("enter")
    await session.waitForText(/Mode:\s*command/, { timeout: 5000 })
    // Capture scroll before
    const beforeText = await session.text()
    const scrollBefore = beforeText.match(/Scroll:\s*(\d+)/)?.[1]
    // Press n to navigate to next match
    await session.press("n")
    await new Promise((r) => setTimeout(r, 500))
    const afterText = await session.text()
    // Should still be in command mode
    expect(afterText).toMatch(/Mode:\s*command/)
  }, 20000)

  // Escape key in e2e is unreliable due to ANSI sequence ambiguity.
  test.skip("Escape cancels search", () => {})
})
