import { launchTerminal, type Session } from "tuistory"
import { resolve } from "path"
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js"

const REPO_ROOT = resolve(import.meta.dir, "../../..")
const CONFIG_NAMESPACE = "shell-e2e"
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE)

export async function launchShellFixture(fixture: string): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE)
  const fixturePath = resolve(import.meta.dir, "fixtures", fixture)
  const session = await launchTerminal({
    command: "bun",
    args: ["--conditions=@tooee/source", fixturePath],
    cols: 80,
    rows: 24,
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
  })
  await session.waitForText("which-key e2e ready", { timeout: 15000 })
  await Bun.sleep(150)
  return session
}
