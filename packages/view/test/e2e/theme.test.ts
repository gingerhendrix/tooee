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
    await session.waitForText("Filter themes", { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Filter themes/)
  }, 20000)

  test("picking a theme changes the active theme", async () => {
    session = await launchView("sample.md")
    const initial = extractTheme(await session.text())
    await session.press("t")
    await session.waitForText("Filter themes", { timeout: 10000 })
    // Type to filter the list to a specific theme, then select it
    const target = initial === "dracula" ? "solarized" : "dracula"
    await session.type(target)
    await session.waitForText(target, { timeout: 10000 })
    await session.press("enter")
    // Wait for theme picker to close and theme to apply
    await session.waitForText(`Theme: ${target}`, { timeout: 10000 })
    const after = extractTheme(await session.text())
    expect(after).toBe(target)
  }, 20000)
})
