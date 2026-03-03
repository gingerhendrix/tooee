import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchRouter } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("loaders", () => {
  test("shows pending component during load", async () => {
    session = await launchRouter(["--loader-delay=2000"])
    await session.press("3")
    await session.waitForText("Loading...", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Loading...")
  }, 20000)

  test("shows loaded content after resolve", async () => {
    session = await launchRouter(["--loader-delay=200"])
    await session.press("3")
    await session.waitForText("Screen:slow:loaded", { timeout: 10000 })
    const text = await session.text()
    expect(text).toContain("Screen:slow:loaded")
    expect(text).toContain("Route:slow")
  }, 20000)

  test("shows error component on failure", async () => {
    session = await launchRouter()
    await session.press("4")
    await session.waitForText("Error:", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Error:route-failed")
  }, 20000)
})
