import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("default cursor behavior", () => {
  test("starts in cursor mode by default", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("j/k move cursor from startup", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    // Pressing j should work immediately — no need to enter cursor mode
    await session.press("j")
    // Cursor should have moved to 1 after pressing j
    const text = await session.text()
    expect(text).toMatch(/Cursor:\s*1/)
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("v enters select mode from cursor", async () => {
    session = await launchView("long.md")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("v")
    await session.waitForText(/Mode:\s*select/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*select/)
  }, 20000)
})
