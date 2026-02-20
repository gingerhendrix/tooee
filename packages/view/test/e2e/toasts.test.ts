import { describe, test, expect, afterEach } from "bun:test"
import { launchTerminal, type Session } from "tuistory"
import { resolve } from "path"
import { ensureTestConfigHome, resetTestConfig } from "../../../../test/support/test-config.js"

const REPO_ROOT = resolve(import.meta.dir, "../../../..")
const DEMO = resolve(REPO_ROOT, "examples/toasts-demo.ts")
const CONFIG_NAMESPACE = "toasts-e2e"
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE)

async function launchDemo(): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE)
  const session = await launchTerminal({
    command: "bun",
    args: ["--conditions=@tooee/source", DEMO],
    cols: 80,
    rows: 24,
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
  })
  // Wait for the app to be ready — status bar shows "Format:"
  await session.waitForText("Format:", { timeout: 15000 })
  return session
}

let session: Session

afterEach(() => {
  try {
    session?.close()
  } catch {}
})

describe("toasts e2e", () => {
  test("pressing 1 shows info toast", async () => {
    session = await launchDemo()
    await session.press("1")
    await session.waitForText("This is an info message", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("This is an info message")
  }, 20000)

  test("pressing 4 shows error toast", async () => {
    session = await launchDemo()
    await session.press("4")
    await session.waitForText("Something went wrong!", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Something went wrong!")
  }, 20000)

  test("error toast replaces info toast", async () => {
    session = await launchDemo()
    await session.press("1")
    await session.waitForText("This is an info message", { timeout: 5000 })

    await session.press("4")
    await session.waitForText("Something went wrong!", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Something went wrong!")
    // Info toast should be replaced
    expect(text).not.toContain("This is an info message")
  }, 20000)

  test("toast auto-dismisses after duration", async () => {
    session = await launchDemo()
    await session.press("2")
    // Success toast (1.5s default)
    await session.waitForText("Operation completed successfully", { timeout: 5000 })

    // Wait for auto-dismiss (success = 1500ms, add buffer)
    await new Promise((r) => setTimeout(r, 2500))
    const text = await session.text()
    expect(text).not.toContain("Operation completed successfully")
  }, 20000)

  test("dedup updates toast in place", async () => {
    session = await launchDemo()
    await session.press("5")
    await session.waitForText("Pressed 1 time", { timeout: 5000 })

    await session.press("5")
    await session.waitForText("Pressed 2 times", { timeout: 5000 })
    const text = await session.text()
    expect(text).toContain("Pressed 2 times")
    expect(text).not.toContain("Pressed 1 time")
  }, 20000)
})
