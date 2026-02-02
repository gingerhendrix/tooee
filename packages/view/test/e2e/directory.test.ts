import { describe, test, expect, afterEach } from "bun:test"
import { launchTerminal, type Session } from "tuistory"
import { resolve } from "path"

const REPO_ROOT = resolve(import.meta.dir, "../../../..")
const CLI = resolve(REPO_ROOT, "apps/cli/src/main.ts")
const TEST_DIR = resolve(import.meta.dir, "../fixtures/test-dir")

let session: Session

afterEach(() => {
  try { session?.close() } catch {}
})

async function launchViewDir(): Promise<Session> {
  const s = await launchTerminal({
    command: "bun",
    args: [CLI, "view", TEST_DIR],
    cols: 80,
    rows: 24,
    cwd: REPO_ROOT,
  })
  await s.waitForText("Format:", { timeout: 15000 })
  return s
}

describe("directory mode e2e", () => {
  test("opens first file and shows position", async () => {
    session = await launchViewDir()
    const text = await session.text()
    expect(text).toContain("alpha.md")
    expect(text).toContain("1/3")
  }, 20000)

  test("l switches to next file", async () => {
    session = await launchViewDir()
    await session.press("l")
    await session.waitForText("beta.ts", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("beta.ts")
    expect(text).toContain("2/3")
  }, 20000)

  test("h goes back to previous file", async () => {
    session = await launchViewDir()
    await session.press("l")
    await session.waitForText("beta.ts", { timeout: 5000 })
    await session.press("h")
    await session.waitForText("alpha.md", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("alpha.md")
    expect(text).toContain("1/3")
  }, 20000)

  test("shows file count in title", async () => {
    session = await launchViewDir()
    await session.press("l")
    await session.waitForText("2/3", { timeout: 5000 })
    await session.press("l")
    await session.waitForText("3/3", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("gamma.txt")
  }, 20000)
})
