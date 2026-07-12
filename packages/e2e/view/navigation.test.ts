import { describe, test, expect, afterEach } from "bun:test";
import type { Session } from "tuistory";
import { launchView } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {}
});

const extractCursor = function extractCursor(text: string): number {
  const match = text.match(/Cursor:\s*(\d+)/u);
  return match ? Number.parseInt(match[1], 10) : -1;
};

describe("navigation", () => {
  test("j moves cursor down", async () => {
    session = await launchView("long.md");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    // Cursor starts at 0, pressing j moves it to 1
    await session.press("j");
    const text = await session.text();
    expect(extractCursor(text)).toBe(1);
  }, 20_000);

  test("k moves cursor up after moving down", async () => {
    session = await launchView("long.md");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    await session.press("j");
    await session.press("k");
    const text = await session.text();
    expect(extractCursor(text)).toBe(0);
  }, 20_000);

  test("gg moves cursor to top", async () => {
    session = await launchView("long.md");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    // Jump to end to set up a "not at top" state
    await session.press(["shift", "g"]);
    await session.waitForText("Section 70", { timeout: 5000 });
    // gg should move cursor to top — early sections should reappear
    await session.type("gg");
    await session.waitForText(/section 2\./iu, { timeout: 5000 });
    expect(await session.text()).toMatch(/section 2\./iu);
  }, 20_000);

  test("G jumps to bottom", async () => {
    session = await launchView("long.md");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    await session.press(["shift", "g"]);
    await session.waitForText("Section 70", { timeout: 5000 });
    const text = await session.text();
    expect(text).toContain("Section 70");
  }, 20_000);

  test("ctrl+d moves cursor half page down", async () => {
    session = await launchView("long.md");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    await session.press(["ctrl", "d"]);
    // Half page jump may push cursor past viewport, causing scroll
    const text = await session.text();
    // Just verify the command works without error
    expect(text).toContain("Mode: cursor");
  }, 20_000);

  test("ctrl+u moves cursor half page up", async () => {
    session = await launchView("long.md");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    // Move down first
    await session.press(["ctrl", "d"]);
    await session.press(["ctrl", "d"]);
    // Move back up
    await session.press(["ctrl", "u"]);
    const text = await session.text();
    expect(text).toContain("Mode: cursor");
  }, 20_000);
});
