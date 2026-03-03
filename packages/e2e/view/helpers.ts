import { launchTerminal, type Session } from "tuistory"
import { resolve } from "path"
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js"

const REPO_ROOT = resolve(import.meta.dir, "../../..")
const CLI = resolve(REPO_ROOT, "apps/cli/src/main.ts")
export const VIEW_FIXTURES = resolve(REPO_ROOT, "packages/view/test/fixtures")
const CONFIG_NAMESPACE = "view-e2e"
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE)

export async function launchView(fixture: string): Promise<Session> {
  const fixturePath = resolve(VIEW_FIXTURES, fixture)
  resetTestConfig(CONFIG_NAMESPACE)
  const session = await launchTerminal({
    command: "bun",
    args: ["--conditions=@tooee/source", CLI, "view", fixturePath],
    cols: 80,
    rows: 24,
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
  })
  // Wait for the app to be ready — status bar shows "Format:" and "Mode:"
  await session.waitForText("Format:", { timeout: 15000 })
  await session.waitForText(/Mode:/, { timeout: 5000 })
  // Buffer for key handler registration after render (prevents CI flakes)
  await Bun.sleep(150)
  return session
}
