import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";
import path from "node:path";
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const CLI = path.resolve(REPO_ROOT, "apps/cli/src/main.ts");
export const VIEW_FIXTURES = path.resolve(REPO_ROOT, "packages/view/test/fixtures");
const CONFIG_NAMESPACE = "view-e2e";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

export const launchView = async function launchView(fixture: string): Promise<Session> {
  const fixturePath = path.resolve(VIEW_FIXTURES, fixture);
  resetTestConfig(CONFIG_NAMESPACE);
  const session = await launchTerminal({
    args: ["--conditions=@tooee/source", CLI, "view", fixturePath],
    cols: 80,
    command: "bun",
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
    rows: 24,
  });
  // Wait for the app to be ready — status bar shows "Format:" and "Mode:"
  await session.waitForText("Format:", { timeout: 15_000 });
  await session.waitForText(/Mode:/u, { timeout: 5000 });
  // Buffer for key handler registration after render (prevents CI flakes)
  await Bun.sleep(150);
  return session;
};
