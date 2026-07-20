import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";
import path from "node:path";
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const EXAMPLE_APP = path.resolve(REPO_ROOT, "examples/panels.tsx");
const INSERT_PANEL_FIXTURE = path.resolve(import.meta.dir, "fixtures/insert-panel.tsx");
const CONFIG_NAMESPACE = "panels-e2e";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

export const launchPanels = async function launchPanels(): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE);
  const session = await launchTerminal({
    args: ["--conditions=@tooee/source", EXAMPLE_APP],
    cols: 100,
    command: "bun",
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
    rows: 30,
  });
  await session.waitForText("Streams", { timeout: 15_000 });
  return session;
};

export const launchInsertPanel = async function launchInsertPanel(): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE);
  const session = await launchTerminal({
    args: ["--conditions=@tooee/source", INSERT_PANEL_FIXTURE],
    cols: 100,
    command: "bun",
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
    rows: 30,
  });
  await session.waitForText("TAB WAITING", { timeout: 15_000 });
  return session;
};
