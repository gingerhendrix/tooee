import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";
import { resolve } from "node:path";
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CONFIG_NAMESPACE = "shell-e2e";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

export async function launchShellFixture(
  fixture: string,
  readyText = "which-key e2e ready",
): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE);
  const fixturePath = resolve(import.meta.dir, "fixtures", fixture);
  const session = await launchTerminal({
    args: ["--conditions=@tooee/source", fixturePath],
    cols: 80,
    command: "bun",
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
    rows: 24,
  });
  await session.waitForText(readyText, { timeout: 15_000 });
  await Bun.sleep(150);
  return session;
}
