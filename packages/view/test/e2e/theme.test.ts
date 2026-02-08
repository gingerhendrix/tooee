import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.ts"

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
    await new Promise((r) => setTimeout(r, 1000))
    const text = await session.text()
    // Picker should be visible with theme names
    expect(text).toMatch(/Filter themes|tokyonight/)
  }, 20000)

  test("picking a theme changes the active theme", async () => {
    session = await launchView("sample.md")
    const initial = extractTheme(await session.text())
    await session.press("t")
    await new Promise((r) => setTimeout(r, 500))
    // Navigate up (zenburn is last alphabetically, so go up to reach a different theme)
    await session.press("up")
    await new Promise((r) => setTimeout(r, 500))
    await session.press("up")
    await new Promise((r) => setTimeout(r, 500))
    await session.press("up")
    await new Promise((r) => setTimeout(r, 500))
    await session.press("enter")
    await new Promise((r) => setTimeout(r, 1000))
    const after = extractTheme(await session.text())
    expect(after).not.toBe(initial)
  }, 20000)
})
