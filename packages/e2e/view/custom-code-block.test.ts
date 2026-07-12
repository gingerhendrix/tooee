import { describe, test, expect, afterEach } from "bun:test";
import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";
import { resolve } from "node:path";
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const DEMO = resolve(REPO_ROOT, "examples/custom-code-block.ts");
const CONFIG_NAMESPACE = "custom-code-block-e2e";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

async function launchDemo(): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE);
  const session = await launchTerminal({
    args: ["--conditions=@tooee/source", DEMO],
    cols: 80,
    command: "bun",
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
    rows: 40,
  });
  // Wait for the app to be ready — status bar shows "Format:"
  await session.waitForText("Format:", { timeout: 15_000 });
  return session;
}

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {}
});

describe("custom code block renderers e2e", () => {
  test("registered fence renders custom chart instead of code", async () => {
    session = await launchDemo();
    const text = await session.text();
    // The chart renderer draws bars and values, not the raw fence body
    expect(text).toContain("Deploys");
    expect(text).toContain("█");
    expect(text).not.toContain("Deploys,12");
  }, 20_000);

  test("case-insensitive match with info-string options renders custom chart", async () => {
    session = await launchDemo();
    const text = await session.text();
    // ```Chart title=Weekly matches the "chart" registration
    expect(text).toContain("Reviews");
    expect(text).not.toContain("Reviews,9");
  }, 20_000);

  test("unregistered fence falls back to the default code block", async () => {
    session = await launchDemo();
    const text = await session.text();
    expect(text).toContain('"renderer": "default"');
  }, 20_000);

  test("built-in mermaid renders via the registry", async () => {
    session = await launchDemo();
    // Jump to the end where the diagram is.
    await session.press(["shift", "g"]);
    await session.waitForText("Registry", { timeout: 5000 });
    const text = await session.text();
    expect(text).toContain("Markdown");
    expect(text).toContain("Custom Block");
    expect(text).not.toContain("graph LR");
  }, 20_000);
});
