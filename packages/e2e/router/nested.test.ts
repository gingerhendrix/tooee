import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchRouter } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("nested routes", () => {
  test("renders parent and child", async () => {
    session = await launchRouter()
    await session.press("5")
    await session.waitForText("Child:content", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Layout:parent")
    expect(text).toContain("Child:content")
  }, 20000)

  test("back from nested returns to previous", async () => {
    session = await launchRouter()
    await session.press("5")
    await session.waitForText("Child:content", { timeout: 5000 })
    await session.press("backspace")
    await session.waitForText("Screen:home", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Screen:home")
    expect(text).not.toContain("Child:content")
  }, 20000)
})
