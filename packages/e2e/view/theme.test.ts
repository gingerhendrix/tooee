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

const extractTheme = function extractTheme(text: string): string {
  const match = /Theme:\s*(?<theme>\S+)/u.exec(text);
  return match?.groups?.theme ?? "";
};

describe("theme switching", () => {
  test("t opens theme picker", async () => {
    session = await launchView("sample.md");
    const initial = extractTheme(await session.text());
    expect(initial).toBeTruthy();
    await session.press("t");
    await session.waitForText("aura", { timeout: 5000 });
    const text = await session.text();
    expect(text).toMatch(/aura/u);
  }, 20_000);

  test("picking a theme changes the active theme", async () => {
    session = await launchView("sample.md");
    const initial = extractTheme(await session.text());
    await session.press("t");
    await session.waitForText("aura", { timeout: 10_000 });
    await session.press("down");
    await session.press("enter");
    // Wait for theme picker to close and a different previewed theme to apply.
    let after = "";
    for (let i = 0; i < 20; i += 1) {
      // Deferred(lint-sweep): Poll after each render transition until the picker closes.
      // oxlint-disable-next-line no-await-in-loop -- Preserve sequential render polling.
      const text = await session.text();
      after = extractTheme(text);
      if (after && after !== initial && !text.includes("aura")) {
        break;
      }
      // Deferred(lint-sweep): The polling interval controls the render-transition timing.
      // oxlint-disable-next-line no-await-in-loop -- Preserve sequential polling timing.
      await Bun.sleep(250);
    }
    expect(after).not.toBe(initial);
  }, 20_000);
});
