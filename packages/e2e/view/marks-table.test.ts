import { describe, test, expect, afterEach } from "bun:test";
import type { Session } from "tuistory";
import { launchTable } from "./table-helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {
    // The session may already have exited or closed.
  }
});

describe("marks rendering e2e (table content)", () => {
  test("table content with cursor shows cursor indicator in gutter", async () => {
    session = await launchTable("long.csv");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    const text = await session.text();
    expect(text).toMatch(/Mode:\s*cursor/u);
    // Cursor sign (▸) rendered via marks
    expect(text).toContain("▸");
  }, 20_000);

  test("search highlights are visible when searching in table content", async () => {
    session = await launchTable("long.csv");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    // Open search
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
    await session.type("a");
    await session.press("enter");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    const text = await session.text();
    // Search match signs (●) rendered via marks
    expect(text).toContain("●");
  }, 20_000);

  test("cursor moves correctly via marks in table content", async () => {
    session = await launchTable("long.csv");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    await session.waitForText(/Cursor:\s*0/u, { timeout: 5000 });
    // Move cursor down
    await session.press("j");
    await Bun.sleep(200);
    const text = await session.text();
    expect(text).toMatch(/Cursor:\s*1/u);
  }, 20_000);

  test("selection highlighting works in table content", async () => {
    session = await launchTable("long.csv");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    // Enter select mode
    await session.press("v");
    await session.waitForText(/Mode:\s*select/u, { timeout: 5000 });
    // Extend selection
    await session.press("j");
    await session.press("j");
    const text = await session.text();
    expect(text).toMatch(/Mode:\s*select/u);
    // Status bar may truncate spacing — match flexibly
    expect(text).toMatch(/Selected.*\d+/u);
  }, 20_000);

  test("toggle marking works in table content", async () => {
    session = await launchTable("long.csv");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    // Toggle current row with tab
    await session.press("tab");
    await Bun.sleep(200);
    const text = await session.text();
    expect(text).toMatch(/Selected.*1/u);
  }, 20_000);
});
