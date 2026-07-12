import { describe, test, expect, afterEach } from "bun:test";
import type { Session } from "tuistory";
import { launchView } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {}
});

describe("wide code block horizontal scrolling e2e", () => {
  test("wide code block clips instead of wrapping", async () => {
    session = await launchView("wide-code.md");
    const text = await session.text();
    // Left edge visible, right edge clipped (the ASCII row is ~118 cols wide,
    // rendered in an 80-col terminal)
    expect(text).toContain("Alpha station");
    expect(text).not.toContain("Zeta terminal");
    // Block keeps its height, so following content is visible
    expect(text).toContain("After the code.");
  }, 20_000);

  test("l/h scroll the code block under the cursor horizontally", async () => {
    session = await launchView("wide-code.md");
    await session.waitForText(/Mode:\s*cursor/u, { timeout: 5000 });

    // Move cursor from the heading to the code block
    await session.press("j");

    // Scroll right until the far end of the ASCII diagram is visible
    for (let i = 0; i < 20; i++) {
      await session.press("l");
    }
    await session.waitForText("Zeta terminal", { timeout: 8000 });
    const scrolled = await session.text();
    expect(scrolled).toContain("Zeta terminal");
    expect(scrolled).not.toContain("Alpha station");

    // Scroll back to the start
    for (let i = 0; i < 20; i++) {
      await session.press("h");
    }
    await session.waitForText("Alpha station", { timeout: 8000 });
    const restored = await session.text();
    expect(restored).toContain("Alpha station");
    expect(restored).not.toContain("Zeta terminal");
  }, 30_000);
});
