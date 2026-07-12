import { describe, test, expect, afterEach } from "bun:test";
import type { Session } from "tuistory";
import { launchView } from "./helpers.js";

const ESCAPE_SEQUENCE = "\u001B[27u";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {}
});

describe("command palette", () => {
  test(": opens the command palette", async () => {
    session = await launchView("sample.md");
    await session.press(":");
    await session.waitForText("Filter commands", { timeout: 5000 });
    const text = await session.text();
    expect(text).toMatch(/Filter commands/u);
  }, 20_000);

  test("Escape closes the palette", async () => {
    session = await launchView("sample.md");
    await session.press(":");
    await session.waitForText("Filter commands", { timeout: 5000 });
    session.writeRaw(ESCAPE_SEQUENCE);
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });
    const text = await session.text();
    expect(text).not.toMatch(/Filter commands/u);
  }, 20_000);

  test("selecting a command executes it", async () => {
    // Use long.md so there's enough content to actually scroll
    session = await launchView("long.md");
    await session.press(":");
    await session.waitForText("Filter commands", { timeout: 5000 });
    await session.type("cursor to bottom");
    await session.press("enter");
    await session.waitForText("Section 70", { timeout: 5000 });
    const text = await session.text();
    expect(text).toContain("Section 70");
  }, 20_000);
});
