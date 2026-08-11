import { describe, test, expect, afterEach } from "bun:test";
import { launchTerminal } from "tuistory";
import type { Session } from "tuistory";
import path from "node:path";
import { ensureTestConfigHome, resetTestConfig } from "../support/test-config.js";
import { VIEW_FIXTURES } from "./helpers.js";

const REPO_ROOT = path.resolve(import.meta.dir, "../../..");
const CLI = path.resolve(REPO_ROOT, "apps/cli/src/main.ts");
const CONFIG_NAMESPACE = "diff-e2e";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

/**
 * Diffs need a wide terminal: split layout falls back to stacked below 80
 * content columns, and the shared 80-column helper also wraps status values
 * across lines, which makes status assertions unreadable.
 */
const launchDiff = async function launchDiff(fixture: string): Promise<Session> {
  resetTestConfig(CONFIG_NAMESPACE);
  const session = await launchTerminal({
    args: ["--conditions=@tooee/source", CLI, "view", path.resolve(VIEW_FIXTURES, fixture)],
    cols: 120,
    command: "bun",
    cwd: REPO_ROOT,
    env: { ...process.env, XDG_CONFIG_HOME: TEST_CONFIG_HOME },
    rows: 40,
  });
  await session.waitForText("Format:", { timeout: 15_000 });
  await session.waitForText(/Mode:/u, { timeout: 5000 });
  await Bun.sleep(150);
  return session;
};

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {
    // The session may already have exited or closed.
  }
});

describe("diff rendering e2e", () => {
  test("a .patch file opens the diff viewer", async () => {
    session = await launchDiff("sample.patch");
    const text = await session.text();
    expect(text).toContain("Format: diff");
    expect(text).toContain("@@ -1,3 +1,4 @@");
    expect(text).toContain('const target = "terminal";');
    expect(text).toMatch(/Files:\s*2/u);
    expect(text).toMatch(/Changes:\s*\+3 -2/u);
  }, 20_000);

  test("s switches the diff to a split layout", async () => {
    session = await launchDiff("sample.patch");
    await session.press("s");
    await session.waitForText(/Layout:\s*split/u, { timeout: 5000 });
    const text = await session.text();
    const changed = text.split("\n").find((line) => line.includes('const target = "terminal"'));
    expect(changed).toContain('const target = "world"');
  }, 20_000);

  test("] jumps to the next file header", async () => {
    session = await launchDiff("sample.patch");
    await session.press("]");
    await session.waitForText(/At:\s*docs\/notes.md/u, { timeout: 5000 });
    expect(await session.text()).toMatch(/Cursor:\s*2/u);
  }, 20_000);

  test("j steps hunk by hunk", async () => {
    session = await launchDiff("sample.patch");
    await session.press("j");
    await session.waitForText(/At:\s*src\/greet.ts:1/u, { timeout: 5000 });
  }, 20_000);

  test("a markdown diff fence renders as a diff block", async () => {
    session = await launchDiff("diff-fence.md");
    const text = await session.text();
    expect(text).toContain("Review notes");
    expect(text).toContain("@@ -1,3 +1,4 @@");
    expect(text).toContain('const target = "terminal";');
    // The prose-style fence keeps falling back to the plain code block.
    expect(text).toContain("- drop the old plan");
  }, 20_000);
});
