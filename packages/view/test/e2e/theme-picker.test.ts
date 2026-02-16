import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

function extractTheme(text: string): string {
  const match = text.match(/Theme:\s*(\S+)/)
  return match ? match[1] : ""
}

describe("theme picker", () => {
  test("t opens theme picker", async () => {
    session = await launchView("sample.md")
    await session.press("t")
    await session.waitForText("Filter themes", { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Filter themes/)
  }, 20000)

  test("can confirm a theme with Enter", async () => {
    session = await launchView("sample.md")
    const initial = extractTheme(await session.text())
    await session.press("t")
    await session.waitForText("Filter themes", { timeout: 5000 })
    // Navigate down to pick a different theme
    await session.press("down")
    await new Promise((r) => setTimeout(r, 200))
    await session.press("down")
    await new Promise((r) => setTimeout(r, 200))
    await session.press("down")
    await new Promise((r) => setTimeout(r, 200))
    // Confirm
    await session.press("enter")
    await new Promise((r) => setTimeout(r, 500))
    const after = extractTheme(await session.text())
    expect(after).not.toBe(initial)
  }, 20000)
})
