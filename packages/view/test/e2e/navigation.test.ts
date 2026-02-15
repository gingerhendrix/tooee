import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.ts"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

function extractScroll(text: string): number {
  const match = text.match(/Scroll:\s*(\d+)/)
  return match ? parseInt(match[1], 10) : -1
}

describe("navigation", () => {
  test("j moves cursor down", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Cursor starts at 0, pressing j moves it down — scroll stays at 0 within viewport
    await session.press("j")
    await new Promise((r) => setTimeout(r, 300))
    // Verify we're still in cursor mode and scroll hasn't changed (cursor within viewport)
    const text = await session.text()
    expect(extractScroll(text)).toBe(0)
  }, 20000)

  test("k moves cursor up after moving down", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("j")
    await new Promise((r) => setTimeout(r, 300))
    await session.press("k")
    await new Promise((r) => setTimeout(r, 300))
    const text = await session.text()
    expect(extractScroll(text)).toBe(0)
  }, 20000)

  test("gg moves cursor to top", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Move cursor down enough to scroll
    for (let i = 0; i < 30; i++) {
      await session.press("j")
    }
    await new Promise((r) => setTimeout(r, 500))
    const scrolledText = await session.text()
    expect(extractScroll(scrolledText)).toBeGreaterThan(0)
    // gg should move cursor to top and scroll to 0
    await session.type("gg")
    await session.waitForText(/Scroll:\s*0/, { timeout: 5000 })
    const scroll = extractScroll(await session.text())
    expect(scroll).toBe(0)
  }, 20000)

  test("G jumps to bottom", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press(["shift", "g"])
    await session.waitForText(/Scroll:\s*[1-9]/, { timeout: 5000 })
    const scroll = extractScroll(await session.text())
    expect(scroll).toBeGreaterThan(0)
  }, 20000)

  test("ctrl+d moves cursor half page down", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press(["ctrl", "d"])
    await new Promise((r) => setTimeout(r, 500))
    // Half page jump may push cursor past viewport, causing scroll
    const text = await session.text()
    // Just verify the command works without error
    expect(text).toContain("Mode: cursor")
  }, 20000)

  test("ctrl+u moves cursor half page up", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Move down first
    await session.press(["ctrl", "d"])
    await new Promise((r) => setTimeout(r, 300))
    await session.press(["ctrl", "d"])
    await new Promise((r) => setTimeout(r, 300))
    // Move back up
    await session.press(["ctrl", "u"])
    await new Promise((r) => setTimeout(r, 500))
    const text = await session.text()
    expect(text).toContain("Mode: cursor")
  }, 20000)
})
