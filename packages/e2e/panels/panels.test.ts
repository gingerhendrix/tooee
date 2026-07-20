import { afterEach, describe, expect, test } from "bun:test";
import type { Session } from "tuistory";
import { launchInsertPanel, launchPanels } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {
    // The session may already be closed by the application.
  }
});

describe("panels example", () => {
  test("the active border/title moves on Tab and Shift+Tab", async () => {
    session = await launchPanels();
    let text = await session.text();
    // The active panel's title carries the ▸ marker (and borderActive colour).
    expect(text).toContain("▸ Streams");
    expect(text).not.toContain("▸ Detail");

    await session.press("tab");
    await session.waitForText("▸ Detail", { timeout: 5000 });
    text = await session.text();
    expect(text).toContain("▸ Detail");
    expect(text).not.toContain("▸ Streams");

    // Shift+Tab returns to the first panel.
    await session.press(["shift", "tab"]);
    await session.waitForText("▸ Streams", { timeout: 5000 });
    text = await session.text();
    expect(text).toContain("▸ Streams");
    expect(text).not.toContain("▸ Detail");
  }, 25_000);

  test("only the active panel's keys act (detail router)", async () => {
    session = await launchPanels();
    // Detail is inactive: its "v" command does nothing (falls through to root).
    await session.press("v");
    // Wait for a positive render sentinel after the no-op key before asserting
    // that the inactive route did not appear.
    await session.waitForText("overview: alpha", { timeout: 5000 });
    let text = await session.text();
    expect(text).toContain("overview: alpha");
    expect(text).not.toContain("raw: alpha");

    // Activate detail: "v" now pushes its panel-local router.
    await session.press("tab");
    await session.waitForText("▸ Detail", { timeout: 5000 });
    await session.press("v");
    await session.waitForText("raw: alpha", { timeout: 5000 });

    // Backspace pops the detail panel's own stack only.
    await session.press("backspace");
    await session.waitForText("overview: alpha", { timeout: 5000 });
    text = await session.text();
    expect(text).not.toContain("raw: alpha");
  }, 25_000);

  test("list selection moves only while the Streams panel is active", async () => {
    session = await launchPanels();
    // Streams active: j advances the selection marker.
    await session.press("j");
    await session.waitForText("▸ beta", { timeout: 5000 });

    // Switch to Detail; j is now unowned by the list and leaves it unchanged.
    await session.press("tab");
    await session.waitForText("▸ Detail", { timeout: 5000 });
    await session.press("j");
    // Positive synchronization sentinel: the active detail panel remains
    // rendered after the inactive list key is ignored.
    await session.waitForText("overview: beta", { timeout: 5000 });
    const text = await session.text();
    expect(text).toContain("▸ beta");
  }, 25_000);

  test("a modal overlay suspends the panels and restores them on close", async () => {
    session = await launchPanels();
    await session.press("o");
    await session.waitForText("MODAL OPEN", { timeout: 5000 });

    // The modal owns input: Tab is swallowed, so the active panel does not switch.
    await session.press("tab");
    await session.waitForText("MODAL OPEN", { timeout: 5000 });
    let text = await session.text();
    expect(text).toContain("MODAL OPEN");
    expect(text).not.toContain("▸ Detail");

    // Escape closes the modal and returns input to the same panel.
    await session.press("escape");
    await session.waitForText("▸ Streams", { timeout: 5000 });
    text = await session.text();
    expect(text).not.toContain("MODAL OPEN");
    expect(text).toContain("▸ Streams");
  }, 25_000);

  test("insert-mode editor receives typed input and Tab without root fall-through", async () => {
    session = await launchInsertPanel();

    // `q` is also the root quit command. The live process and rendered value
    // prove that the focused editor received it instead.
    await session.press("q");
    await session.waitForText("VALUE:q", { timeout: 5000 });

    // Tab must reach the actual textarea. Its positive sentinel synchronizes
    // the negative assertions that neither switch binding won.
    await session.press("tab");
    await session.waitForText("TAB RECEIVED", { timeout: 5000 });
    const text = await session.text();
    expect(text).toContain("▸ Editor");
    expect(text).not.toContain("▸ Other");
  }, 25_000);
});
