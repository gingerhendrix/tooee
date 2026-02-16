import { launchTerminal, type Session } from "tuistory"
import { resolve } from "path"
import { ensureTestConfigHome, resetTestConfig } from "../../../../test/support/test-config.js"

const REPO_ROOT = resolve(import.meta.dir, "../../../..")
const CLI = resolve(REPO_ROOT, "apps/cli/src/main.ts")
const CONFIG_NAMESPACE = "view-e2e"
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE)

export async function launchView(fixture: string): Promise<Session> {
  const fixturePath = resolve(import.meta.dir, "../fixtures", fixture)
  resetTestConfig(CONFIG_NAMESPACE)
  const session = await launchTerminal({
    command: "bun",
    args: ["--conditions=@tooee/source", CLI, "view", fixturePath],
    cols: 80,
    rows: 24,
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
  })
  // Wait for the app to be ready — status bar shows "Format:"
  await session.waitForText("Format:", { timeout: 15000 })
  return session
}
