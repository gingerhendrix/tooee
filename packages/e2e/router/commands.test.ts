import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchRouter } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("command scoping", () => {
  test("backspace goes back when stack > 1", async () => {
    session = await launchRouter()
    // Push detail
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    // Backspace should go back to home
    await session.press("backspace")
    await session.waitForText("Screen:home", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Screen:home")
  }, 20000)

  test("backspace does nothing at root", async () => {
    session = await launchRouter()
    const textBefore = await session.text()
    expect(textBefore).toContain("Screen:home")
    // Backspace at root should be a no-op
    await session.press("backspace")
    await new Promise((r) => setTimeout(r, 500))
    const textAfter = await session.text()
    expect(textAfter).toContain("Screen:home")
    expect(textAfter).toContain("Route:home")
  }, 20000)

  test("route-specific commands only active on that route", async () => {
    session = await launchRouter()
    // Push to detail screen
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    // Press + (home's increment command) — should not work on detail
    await session.press("+")
    await new Promise((r) => setTimeout(r, 500))
    const text = await session.text()
    // Should still be on detail, not showing any counter
    expect(text).toContain("Screen:detail:42")
    expect(text).not.toContain("Counter:")
  }, 20000)
})
