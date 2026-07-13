import { afterEach, expect, test } from "bun:test";
import type { Session } from "tuistory";
import { launchShellFixture } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {
    // The session may already be closed by the application.
  }
});

test("owned session restores the real PTY and removes health listeners", async () => {
  session = await launchShellFixture("session-cleanup-app.tsx", "session cleanup ready");
  await session.press("q");
  await session.waitForText("session cleanup complete", { timeout: 5000 });

  const text = await session.text();
  expect(text).toContain("session cleanup complete raw=false end=0 close=0");
}, 20_000);
