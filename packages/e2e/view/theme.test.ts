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

describe("theme switching", () => {
  test("t opens theme picker", async () => {
    session = await launchView("sample.md")
    const initial = extractTheme(await session.text())
    expect(initial).toBeTruthy()
    await session.press("t")
    await session.waitForText("aura", { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/aura/)
  }, 20000)

  test("picking a theme changes the active theme", async () => {
    session = await launchView("sample.md")
    const initial = extractTheme(await session.text())
    await session.press("t")
    await session.waitForText("aura", { timeout: 10000 })
    await session.press("down")
    await session.press("enter")
    // Wait for theme picker to close and a different previewed theme to apply.
    let after = ""
    for (let i = 0; i < 20; i++) {
      const text = await session.text()
      after = extractTheme(text)
      if (after && after !== initial && !text.includes("aura")) break
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    expect(after).not.toBe(initial)
  }, 20000)
})
