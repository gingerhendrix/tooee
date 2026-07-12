import { describe, test, expect, afterEach } from "bun:test";
import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";
import { resolve } from "node:path";
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const DEMO = resolve(REPO_ROOT, "examples/custom-code-block-app.ts");
const CONFIG_NAMESPACE = "custom-code-block-app-e2e";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

async function launchDemo(): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE);
  const session = await launchTerminal({
    command: "bun",
    args: ["--conditions=@tooee/source", DEMO],
    cols: 80,
    rows: 40,
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
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

describe("custom code block app e2e", () => {
  test("progress and callout renderers replace their fence bodies", async () => {
    session = await launchDemo();
    const text = await session.text();
    // Progress bars render instead of the raw "label,percent" lines
    expect(text).toContain("█");
    expect(text).toContain("100%");
    expect(text).not.toContain("api,100");
    // Callout renders its kind (from the fence info string) and body
    expect(text).toContain("WARNING");
    expect(text).toContain("Rollback window");
  }, 20_000);

  test("wide timeline clips instead of wrapping", async () => {
    session = await launchDemo();
    await session.press("G"); // jump to the end where the timeline is
    await session.waitForText("edge-cache", { timeout: 5000 });
    const text = await session.text();
    // Left edge visible (labels + early ticks), right edge clipped
    expect(text).toContain("0:00");
    expect(text).toContain("checkout");
    expect(text).not.toContain("24:00");
    // Raw fence body is not shown
    expect(text).not.toContain("checkout,0,3");
  }, 20_000);

  test("h/l pan the timeline via the hScroll opt-in", async () => {
    session = await launchDemo();
    await session.press("c"); // enter cursor mode
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 });
    await session.press("G"); // cursor to the last block (the timeline)
    await session.waitForText("edge-cache", { timeout: 5000 });

    // Pan right until the far end of the timeline is visible
    for (let i = 0; i < 30; i++) {
      await session.press("l");
    }
    await session.waitForText("24:00", { timeout: 8000 });

    // Pan back to the start
    for (let i = 0; i < 30; i++) {
      await session.press("h");
    }
    await session.waitForText("0:00", { timeout: 8000 });
    const restored = await session.text();
    expect(restored).not.toContain("24:00");
  }, 30_000);
});
