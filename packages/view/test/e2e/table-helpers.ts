import { launchTerminal, type Session } from "tuistory"
import { resolve } from "path"
import { ensureTestConfigHome, resetTestConfig } from "../../../../test/support/test-config.ts"

const REPO_ROOT = resolve(import.meta.dir, "../../../..")
const CLI = resolve(REPO_ROOT, "apps/cli/src/main.ts")
const CONFIG_NAMESPACE = "view-context-e2e"
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE)

export async function launchTable(fixture: string): Promise<Session> {
  const fixturePath = resolve(import.meta.dir, "../fixtures", fixture)
  resetTestConfig(CONFIG_NAMESPACE)
  const session = await launchTerminal({
    command: "bun",
    args: [CLI, "table", fixturePath],
    cols: 80,
    rows: 24,
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
  })
  await session.waitForText("Rows:", { timeout: 15000 })
  return session
}
