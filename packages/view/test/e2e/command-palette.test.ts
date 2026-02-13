import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.ts"

const ESCAPE_SEQUENCE = "\x1b[27u"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

function extractScroll(text: string): number {
  const match = text.match(/Scroll:\s*(\d+)/)
  return match ? Number(match[1]) : 0
}

describe("command palette", () => {
  test(": opens the command palette", async () => {
    session = await launchView("sample.md")
    await session.press(":")
    await session.waitForText("Filter commands", { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Filter commands/)
  }, 20000)

  test("Escape closes the palette", async () => {
    session = await launchView("sample.md")
    await session.press(":")
    await session.waitForText("Filter commands", { timeout: 5000 })
    session.writeRaw(ESCAPE_SEQUENCE)
    await new Promise((r) => setTimeout(r, 300))
    const text = await session.text()
    expect(text).not.toMatch(/Filter commands/)
  }, 20000)

  test("selecting a command executes it", async () => {
    // Use long.md so there's enough content to actually scroll
    session = await launchView("long.md")
    const before = extractScroll(await session.text())
    await session.press(":")
    await session.waitForText("Filter commands", { timeout: 5000 })
    await session.type("scroll down")
    await new Promise((r) => setTimeout(r, 200))
    await session.press("enter")
    await new Promise((r) => setTimeout(r, 500))
    const after = extractScroll(await session.text())
    expect(after).toBeGreaterThan(before)
  }, 20000)
})
