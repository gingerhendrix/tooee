import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act } from "react";
import { resolve } from "node:path";
import { MouseButtons } from "@opentui/core/testing";
import { TooeeProvider } from "@tooee/shell";
import type { ActionDefinition } from "@tooee/commands";
import { View } from "../src/View.js";
import { createTableFileProvider } from "../src/default-provider.js";

const CSV = resolve(import.meta.dir, "fixtures/data.csv");

const ACTIONS: ActionDefinition[] = [
  { id: "row.copy", title: "Copy row", hotkey: "y", modes: ["cursor"], handler: () => {} },
  { id: "row.open", title: "Open row", modes: ["cursor"], handler: () => {} },
];

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

async function setup() {
  const s = await testRender(
    <TooeeProvider>
      <View contentProvider={createTableFileProvider(CSV)} actions={ACTIONS} />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  );
  await s.renderOnce();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100));
  });
  await s.renderOnce();
  return s;
}

function lineOf(frame: string, text: string): { x: number; y: number } {
  const lines = frame.split("\n");
  for (let y = 0; y < lines.length; y++) {
    const x = lines[y].indexOf(text);
    if (x >= 0) return { x, y };
  }
  return { x: -1, y: -1 };
}

describe("Table view mouse integration", () => {
  test("right-click on a row opens the context menu with row actions", async () => {
    testSetup = await setup();
    // Menu actions are not on screen before the right-click.
    expect(testSetup.captureCharFrame()).not.toContain("Copy row");

    const pos = lineOf(testSetup.captureCharFrame(), "Bob");
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.RIGHT);
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Copy row");
    expect(frame).toContain("Open row");
  });

  test("Escape dismisses the context menu", async () => {
    testSetup = await setup();
    const pos = lineOf(testSetup.captureCharFrame(), "Alice");

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.RIGHT);
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Copy row");

    await act(async () => {
      testSetup.mockInput.pressEscape();
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).not.toContain("Copy row");
  });

  test("host mode is restored to cursor after the context menu closes", async () => {
    testSetup = await setup();
    expect(testSetup.captureCharFrame()).toMatch(/Mode:\s*cursor/);

    const pos = lineOf(testSetup.captureCharFrame(), "Alice");
    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.RIGHT);
    });
    await testSetup.renderOnce();

    // The context menu overlay switches the host into insert mode while open.
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("Copy row");
    expect(frame).toMatch(/Mode:\s*insert/);

    await act(async () => {
      testSetup.mockInput.pressEscape();
    });
    await testSetup.renderOnce();

    frame = testSetup.captureCharFrame();
    expect(frame).not.toContain("Copy row");
    expect(frame).toMatch(/Mode:\s*cursor/);
  });
});

describe("Table view mouse guards while a modal overlay is open", () => {
  test("right-click on a margin row does not open the context menu", async () => {
    testSetup = await setup();
    // Capture the row position first; the centered theme picker leaves the
    // left margin (and these row cells) clickable.
    const pos = lineOf(testSetup.captureCharFrame(), "Bob");
    expect(pos.y).toBeGreaterThan(-1);

    // `t` opens the theme picker (a modal owned command surface).
    await act(async () => {
      testSetup.mockInput.pressKey("t");
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Filter themes");

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.RIGHT);
    });
    await testSetup.renderOnce();

    // No context menu stacked over the picker.
    expect(testSetup.captureCharFrame()).not.toContain("Copy row");
  });

  test("left-click on a margin row does not move the cursor", async () => {
    testSetup = await setup();
    const frame0 = testSetup.captureCharFrame();
    expect(frame0).toMatch(/Cursor:\s*0/);
    const pos = lineOf(frame0, "Bob");
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      testSetup.mockInput.pressKey("t");
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Filter themes");

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    // Close the picker; the cursor must not have moved to Bob's row.
    await act(async () => {
      testSetup.mockInput.pressEscape();
    });
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain("Filter themes");
    expect(frame).toMatch(/Cursor:\s*0/);
    expect(frame).not.toMatch(/Cursor:\s*1/);
  });
});

describe("Overlay close button integration", () => {
  test("clicking ✕ on the open theme picker closes it", async () => {
    testSetup = await setup();
    await act(async () => {
      testSetup.mockInput.pressKey("t");
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Filter themes");
    const pos = lineOf(frame, "✕");
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(testSetup.captureCharFrame()).not.toContain("Filter themes");
  });
});
