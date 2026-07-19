import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";
import path from "node:path";
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const CONFIG_NAMESPACE = "shell-e2e";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

export const launchShellFixture = async function launchShellFixture(
  fixture: string,
  readyText = "which-key e2e ready",
  options: { exitMarker?: string } = {},
): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE);
  const fixturePath = path.resolve(import.meta.dir, "fixtures", fixture);
  const command =
    options.exitMarker !== undefined && options.exitMarker !== ""
      ? {
          args: [
            "-lc",
            `bun --conditions=@tooee/source ${JSON.stringify(fixturePath)}; printf '\\n%s\\n' ${JSON.stringify(options.exitMarker)}`,
          ],
          command: "bash",
        }
      : { args: ["--conditions=@tooee/source", fixturePath], command: "bun" };
  const session = await launchTerminal({
    ...command,
    cols: 80,
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
    rows: 24,
  });
  await session.waitForText(readyText, { timeout: 15_000 });
  await Bun.sleep(150);
  return session;
};
