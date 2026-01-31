import { describe, test, expect, afterEach } from "bun:test"
import { launchTerminal, type Session } from "tuistory"
import { resolve } from "path"

const HARNESS = resolve(import.meta.dir, "harness.tsx")

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

async function launch(): Promise<Session> {
  session = await launchTerminal({
    command: "bun",
    args: [HARNESS],
    cols: 80,
    rows: 24,
    cwd: resolve(import.meta.dir, "../.."),
  })
  await session.waitForText("ready", { timeout: 10000 })
  return session
}

describe("functional: hotkey commands", () => {
  test("ctrl+s fires save command", async () => {
    await launch()
    await session.press(["ctrl", "s"])
    const text = await session.waitForText("FIRED:save", { timeout: 5000 })
    expect(text).toContain("FIRED:save")
  }, 20000)

  test("plain key 'q' fires quit command", async () => {
    await launch()
    await session.press("q")
    const text = await session.waitForText("FIRED:quit", { timeout: 5000 })
    expect(text).toContain("FIRED:quit")
  }, 20000)

  test("sequence 'g g' fires go-top command", async () => {
    await launch()
    await session.press("g")
    await session.press("g")
    const text = await session.waitForText("FIRED:go-top", { timeout: 5000 })
    expect(text).toContain("FIRED:go-top")
  }, 20000)

  // NOTE: ctrl+shift+<key> can't be distinguished from ctrl+<key> in traditional
  // terminal protocols. The kitty keyboard protocol supports it, but tuistory's
  // ghostty emulator may not negotiate it with the child process. Skipping.
  test.skip("ctrl+shift+p fires palette command", async () => {
    await launch()
    await session.press(["ctrl", "shift", "p"])
    const text = await session.waitForText("FIRED:palette", { timeout: 5000 })
    expect(text).toContain("FIRED:palette")
  }, 20000)

  test("non-matching key does not fire any command", async () => {
    await launch()
    await session.press("x")
    // Wait a bit then check no command fired
    await new Promise((r) => setTimeout(r, 500))
    const text = await session.text({ trimEnd: true })
    expect(text).not.toContain("FIRED:")
  }, 20000)
})
