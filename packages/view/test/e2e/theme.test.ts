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
  test("t cycles to next theme", async () => {
    session = await launchView("sample.md")
    const initial = extractTheme(await session.text())
    await session.press("t")
    // Wait for theme change
    await new Promise((r) => setTimeout(r, 1000))
    const after = extractTheme(await session.text())
    expect(after).not.toBe(initial)
  }, 20000)

  test("T cycles to previous theme", async () => {
    session = await launchView("sample.md")
    const initial = extractTheme(await session.text())
    await session.press("t")
    await new Promise((r) => setTimeout(r, 1000))
    const middle = extractTheme(await session.text())
    await session.press("T")
    await new Promise((r) => setTimeout(r, 1000))
    const after = extractTheme(await session.text())
    expect(middle).not.toBe(initial)
    expect(after).toBe(initial)
  }, 20000)
})
