import { describe, test, expect, afterEach } from "bun:test";
import type { Session } from "tuistory";
import { launchView } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {
    // The session may already have exited or closed.
  }
});

describe("search e2e", () => {
  test("/ opens search bar", async () => {
    session = await launchView("long.md");
    // Verify we start in cursor mode
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    const before = await session.text();
    expect(before).toMatch(/Mode:\s*cursor/u);
    // Press / to open search — retry until the status bar changes
    // (on slow CI the first keypress can be dropped)
    for (let attempt = 0; attempt < 3; attempt += 1) {
      // Deferred(lint-sweep): Retry keystrokes must be delivered one at a time while the UI updates.
      // oxlint-disable-next-line no-await-in-loop -- Preserve sequential terminal input.
      await session.press("/");
      // Deferred(lint-sweep): The retry intentionally waits for the preceding key's render transition.
      // oxlint-disable-next-line no-await-in-loop -- Preserve sequential render timing.
      await Bun.sleep(500);
      // Deferred(lint-sweep): Inspect each frame before deciding whether another retry is needed.
      // oxlint-disable-next-line no-await-in-loop -- Preserve ordered polling.
      const check = await session.text();
      if (!/Mode:\s*cursor/u.test(check)) {
        break;
      }
    }
    const text = await session.text();
    // The search bar replaces the status bar so Mode: cursor is gone
    expect(text).not.toMatch(/Mode:\s*cursor/u);
  }, 20_000);

  test("type query and submit search, then n navigates", async () => {
    session = await launchView("long.md");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    // Open search — retry until search bar appears
    for (let attempt = 0; attempt < 3; attempt += 1) {
      // Deferred(lint-sweep): Retry keystrokes must be delivered one at a time while the UI updates.
      // oxlint-disable-next-line no-await-in-loop -- Preserve sequential terminal input.
      await session.press("/");
      // Deferred(lint-sweep): The retry intentionally waits for the preceding key's render transition.
      // oxlint-disable-next-line no-await-in-loop -- Preserve sequential render timing.
      await Bun.sleep(500);
      // Deferred(lint-sweep): Inspect each frame before deciding whether another retry is needed.
      // oxlint-disable-next-line no-await-in-loop -- Preserve ordered polling.
      const check = await session.text();
      if (!/Mode:\s*cursor/u.test(check)) {
        break;
      }
    }
    // Type a search query
    await session.type("Section");
    // Submit search (Enter returns to cursor mode)
    await session.press("enter");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    // Press n to navigate to next match
    await session.press("n");
    const afterText = await session.text();
    // Should still be in cursor mode
    expect(afterText).toMatch(/Mode:\s*cursor/u);
  }, 20_000);

  test("Escape cancels search", async () => {
    session = await launchView("long.md");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    // Open search — retry until search bar appears
    for (let attempt = 0; attempt < 3; attempt += 1) {
      // Deferred(lint-sweep): Retry keystrokes must be delivered one at a time while the UI updates.
      // oxlint-disable-next-line no-await-in-loop -- Preserve sequential terminal input.
      await session.press("/");
      // Deferred(lint-sweep): The retry intentionally waits for the preceding key's render transition.
      // oxlint-disable-next-line no-await-in-loop -- Preserve sequential render timing.
      await Bun.sleep(500);
      // Deferred(lint-sweep): Inspect each frame before deciding whether another retry is needed.
      // oxlint-disable-next-line no-await-in-loop -- Preserve ordered polling.
      const check = await session.text();
      if (!/Mode:\s*cursor/u.test(check)) {
        break;
      }
    }
    await session.type("Section");
    // Send kitty-encoded Escape (raw \x1b is ambiguous)
    session.writeRaw("\u001B[27u");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    const text = await session.text();
    expect(text).toMatch(/Mode:\s*cursor/u);
  }, 20_000);
});
