import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchRouter } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("state caching", () => {
  test("state survives navigation", async () => {
    session = await launchRouter()
    // Increment counter 3 times with + key
    await session.press("+")
    await session.waitForText("Counter:1", { timeout: 5000 })
    await session.press("+")
    await session.waitForText("Counter:2", { timeout: 5000 })
    await session.press("+")
    await session.waitForText("Counter:3", { timeout: 5000 })
    // Push detail
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    // Pop back to home
    await session.press("backspace")
    await session.waitForText("Screen:home", { timeout: 5000 })
    // Counter should be preserved
    const text = await session.text()
    expect(text).toContain("Counter:3")
  }, 20000)

  test("reset clears cached state", async () => {
    session = await launchRouter()
    // Increment counter
    await session.press("+")
    await session.waitForText("Counter:1", { timeout: 5000 })
    await session.press("+")
    await session.waitForText("Counter:2", { timeout: 5000 })
    // Push detail
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    // Reset to home (clears all state)
    await session.press("x")
    await session.waitForText("Screen:home", { timeout: 5000 })
    // Counter should be back to 0
    const text = await session.text()
    expect(text).toContain("Counter:0")
  }, 20000)
})
