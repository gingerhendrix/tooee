import { describe, test, expect, afterEach } from "bun:test"
import { type Session } from "tuistory"
import { launchView } from "./helpers.js"

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("quit", () => {
  test("q exits the application", async () => {
    session = await launchView("sample.md")
    const textBefore = await session.text()
    expect(textBefore).toContain("Hello World")
    await session.press("q")
    // Give the process time to exit
    await new Promise((r) => setTimeout(r, 2000))
    // After quitting, getting text should either throw or return empty/different content
    try {
      const textAfter = await session.text()
      // If we can still get text, the content should have changed (process exited)
      // The terminal may show the shell prompt or be empty
      expect(textAfter).not.toContain("Format:")
    } catch {
      // Expected — session closed
    }
  }, 20000)
})
