import { describe, test, expect, afterEach } from "bun:test";
import type { Session } from "tuistory";
import { launchView } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {}
});

/**
 * Real-PTY smoke for document left-click dispatch: SGR mouse input parsed from
 * stdin resolves through the row-document geometry to the clicked block. This
 * covers the stdin-parsing seam the in-process shell tests bypass.
 *
 * Right-click context menus are not covered here: tuistory (0.0.16) does not
 * deliver right-button SGR events reliably, so right-click ordering and modal
 * suppression are covered by the in-process tests in
 * `packages/shell/test/document-mouse.test.tsx`.
 */
describe("document mouse e2e", () => {
  test("left-click on a block moves the cursor to that block", async () => {
    session = await launchView("sample.md");
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 });
    await session.waitForText(/Cursor:\s*0/, { timeout: 5000 });

    // Block indexes in sample.md: 0 heading, 1 paragraph, 2 "Section Two".
    await session.click("Section Two");
    await session.waitForText(/Cursor:\s*2/, { timeout: 5000 });

    const text = await session.text();
    expect(text).toMatch(/Cursor:\s*2/);
    expect(text).toMatch(/Mode:\s*cursor/);
  }, 20000);

  test("left-click on a later line of a multi-line block selects that block", async () => {
    session = await launchView("sample.md");
    await session.waitForText(/Mode:\s*cursor/, { timeout: 5000 });

    // Both lines of the fenced code block belong to one block (index 7),
    // which is not the block of the "Code Example" heading above it (index 6).
    await session.click("Code Example");
    await session.waitForText(/Cursor:\s*6/, { timeout: 5000 });

    await session.click("const x = 42");
    await session.waitForText(/Cursor:\s*7/, { timeout: 5000 });

    // Clicking the block's second line keeps the same block selected. The
    // cursor value does not change, so settle briefly before asserting the
    // click did not resolve to a neighboring block.
    await session.click("console.log");
    await new Promise((resolve) => setTimeout(resolve, 300));
    const text = await session.text();
    expect(text).toMatch(/Cursor:\s*7/);
  }, 20000);
});
