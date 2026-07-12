import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";
import { resolve } from "node:path";
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const CLI = resolve(REPO_ROOT, "apps/cli/src/main.ts");
export const VIEW_FIXTURES = resolve(REPO_ROOT, "packages/view/test/fixtures");
const CONFIG_NAMESPACE = "view-context-e2e";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

export async function launchTable(fixture: string): Promise<Session> {
  const fixturePath = resolve(VIEW_FIXTURES, fixture);
  resetTestConfig(CONFIG_NAMESPACE);
  const session = await launchTerminal({
    args: ["--conditions=@tooee/source", CLI, "table", fixturePath],
    cols: 80,
    command: "bun",
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
    rows: 24,
  });
  await session.waitForText("Rows:", { timeout: 15_000 });
  return session;
}
