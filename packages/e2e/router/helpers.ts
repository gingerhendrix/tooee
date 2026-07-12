import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";
import { resolve } from "node:path";
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const FIXTURE_APP = resolve(import.meta.dir, "fixtures/router-app.tsx");
const CONFIG_NAMESPACE = "router-e2e";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

export async function launchRouter(args: string[] = []): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE);
  const session = await launchTerminal({
    args: ["--conditions=@tooee/source", FIXTURE_APP, ...args],
    cols: 80,
    command: "bun",
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
    rows: 24,
  });
  await session.waitForText("Route:", { timeout: 15_000 });
  return session;
}
