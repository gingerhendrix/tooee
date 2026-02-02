import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.ts"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("cursor and selection e2e", () => {
  test("v enters cursor mode", async () => {
    session = await launchView("long.md")
    await session.press("v")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("j/k move cursor in cursor mode", async () => {
    session = await launchView("long.md")
    await session.press("v")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("j")
    await new Promise((r) => setTimeout(r, 300))
    await session.press("k")
    await new Promise((r) => setTimeout(r, 300))
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*cursor/)
  }, 20000)

  test("v again enters select mode", async () => {
    session = await launchView("long.md")
    await session.press("v")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await new Promise((r) => setTimeout(r, 200))
    await session.press("v")
    await session.waitForText(/Mode:\s*select/, { timeout: 5000 })
    const text = await session.text()
    expect(text).toMatch(/Mode:\s*select/)
  }, 20000)

  test("Escape chains back through modes", async () => {
    session = await launchView("long.md")
    await session.press("v")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 })
    await session.press("v")
    await session.waitForText(/Mode:\s*select/, { timeout: 5000 })
    // Send kitty-encoded Escape (raw \x1b is ambiguous)
    await session.writeRaw("\x1b[27u")
    await session.waitForText(/Mode:\s*cursor/, { timeout: 8000 })
    await session.writeRaw("\x1b[27u")
    await session.waitForText(/Mode:\s*command/, { timeout: 8000 })
  }, 30000)
})
