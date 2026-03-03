import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchRouter } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("screen focus", () => {
  test("home screen is focused", async () => {
    session = await launchRouter()
    const text = await session.text()
    expect(text).toContain("Focus:true")
  }, 20000)

  test("pushed screen gets focus", async () => {
    session = await launchRouter()
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Focus:true")
  }, 20000)

  test("previous screen is not rendered after push", async () => {
    session = await launchRouter()
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    const text = await session.text()
    // Home screen content should not be visible (only top of stack renders)
    expect(text).not.toContain("Screen:home")
    expect(text).toContain("Screen:detail:42")
  }, 20000)
})
