import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchRouter } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("navigation", () => {
  test("renders default route", async () => {
    session = await launchRouter()
    const text = await session.text()
    expect(text).toContain("Screen:home")
    expect(text).toContain("Route:home")
    expect(text).toContain("Back:false")
  }, 20000)

  test("push navigates to new route", async () => {
    session = await launchRouter()
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Screen:detail:42")
    expect(text).toContain("Route:detail")
    expect(text).toContain("Back:true")
  }, 20000)

  test("pop returns to previous", async () => {
    session = await launchRouter()
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    await session.press("backspace")
    await session.waitForText("Screen:home", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Screen:home")
    expect(text).toContain("Route:home")
    expect(text).toContain("Back:false")
  }, 20000)

  test("push multiple then pop back", async () => {
    session = await launchRouter()
    // Push detail
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    // Push settings from detail
    await session.press("2")
    await session.waitForText("Screen:settings", { timeout: 5000 })
    const text1 = await session.text()
    expect(text1).toContain("Back:true")
    // Pop back to detail
    await session.press("backspace")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    // Pop back to home
    await session.press("backspace")
    await session.waitForText("Screen:home", { timeout: 5000 })
    const text2 = await session.text()
    expect(text2).toContain("Back:false")
  }, 20000)

  test("replace swaps current route", async () => {
    session = await launchRouter()
    // Push detail first (so home is still in stack)
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    // Replace detail with settings
    await session.press("r")
    await session.waitForText("Screen:settings", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Screen:settings")
    expect(text).toContain("Back:true") // home still in stack below
  }, 20000)

  test("reset clears stack", async () => {
    session = await launchRouter()
    // Push detail
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    // Push settings from detail
    await session.press("2")
    await session.waitForText("Screen:settings", { timeout: 5000 })
    // Reset to home
    await session.press("x")
    await session.waitForText("Screen:home", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Screen:home")
    expect(text).toContain("Back:false")
  }, 20000)

  test("params passed correctly", async () => {
    session = await launchRouter()
    await session.press("1")
    await session.waitForText("Screen:detail:42", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("detail:42")
  }, 20000)
})
