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
  test("j scrolls down", async () => {
    session = await launchView("long.md")
    const before = extractScroll(await session.text())
    await session.press("j")
    await session.waitForText(/Scroll:\s*[1-9]/, { timeout: 5000 })
    const after = extractScroll(await session.text())
    expect(after).toBeGreaterThan(before)
  }, 20000)

  test("k scrolls up after scrolling down", async () => {
    session = await launchView("long.md")
    await session.press("j")
    await session.waitForText(/Scroll:\s*[1-9]/, { timeout: 5000 })
    const before = extractScroll(await session.text())
    await session.press("k")
    await session.waitForText(/Scroll:\s*0/, { timeout: 5000 })
    const after = extractScroll(await session.text())
    expect(after).toBeLessThan(before)
  }, 20000)

  // NOTE: gg (scroll-to-top) hotkey is defined as "gg" in modal.ts but
  // the command system expects space-separated sequences ("g g"). This
  // means the gg binding doesn't currently match keyboard input.
  test("gg jumps to top", async () => {
    session = await launchView("long.md")
    for (let i = 0; i < 5; i++) {
      await session.press("j")
    }
    await session.waitForText(/Scroll:\s*[1-9]/, { timeout: 5000 })
    await session.type("gg")
    await session.waitForText(/Scroll:\s*0/, { timeout: 5000 })
    const scroll = extractScroll(await session.text())
    expect(scroll).toBe(0)
  }, 20000)

  test("G jumps to bottom", async () => {
    session = await launchView("long.md")
    await session.press(["shift", "g"])
    await session.waitForText(/Scroll:\s*[1-9]/, { timeout: 5000 })
    const scroll = extractScroll(await session.text())
    expect(scroll).toBeGreaterThan(0)
  }, 20000)

  test("ctrl+d scrolls half page down", async () => {
    session = await launchView("long.md")
    await session.press(["ctrl", "d"])
    await session.waitForText(/Scroll:\s*[1-9]/, { timeout: 5000 })
    const scroll = extractScroll(await session.text())
    expect(scroll).toBeGreaterThan(0)
  }, 20000)

  test("ctrl+u scrolls half page up", async () => {
    session = await launchView("long.md")
    await session.press(["ctrl", "d"])
    await session.waitForText(/Scroll:\s*[1-9]/, { timeout: 5000 })
    const before = extractScroll(await session.text())
    await session.press(["ctrl", "u"])
    // Wait for scroll to decrease
    await new Promise((r) => setTimeout(r, 500))
    const after = extractScroll(await session.text())
    expect(after).toBeLessThan(before)
  }, 20000)
})
