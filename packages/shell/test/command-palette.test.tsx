import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { TooeeProvider } from "@tooee/shell";
import { useCommand, useMode } from "@tooee/commands";
import { useCurrentOverlay, useHasOverlay } from "@tooee/overlays";
import { press, pressEscape, type TestSession } from "./support/test-helpers.ts";

function PaletteHarness() {
  const mode = useMode();
  const hasOverlay = useHasOverlay();

  // Register some test commands
  useCommand({
    id: "test.visible",
    title: "Visible Command",
    hotkey: "t",
    modes: ["cursor"],
    handler: () => {},
  });

  useCommand({
    id: "test.hidden",
    title: "Hidden Command",
    hotkey: "h",
    modes: ["cursor"],
    hidden: true,
    handler: () => {},
  });

  useCommand({
    id: "test.cursor-only",
    title: "Cursor Only Command",
    hotkey: "c",
    modes: ["cursor"],
    handler: () => {},
  });

  useCommand({
    id: "test.insert-only",
    title: "Insert Only Command",
    hotkey: "i",
    modes: ["insert"],
    handler: () => {},
  });

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`open:${hasOverlay}`} />
    </box>
  );
}

async function setup() {
  const s = await testRender(
    <TooeeProvider>
      <PaletteHarness />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  );
  await s.renderOnce();
  return s;
}

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("command palette", () => {
  test(": opens palette without mutating root mode", async () => {
    testSetup = await setup();
    await press(testSetup, ":");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("open:true");
    expect(frame).toContain("mode:cursor");
  });

  test("close restores cursor mode", async () => {
    testSetup = await setup();
    await press(testSetup, ":");
    const openFrame = testSetup.captureCharFrame();
    expect(openFrame).toContain("open:true");
    expect(openFrame).toContain("mode:cursor");
    await pressEscape(testSetup);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("open:false");
    expect(frame).toContain("mode:cursor");
  });

  test("a command registered after the provider mounts appears in the palette", async () => {
    function LateRegistrant() {
      useCommand({
        id: "test.late",
        title: "Late Arrival Command",
        modes: ["cursor"],
        handler: () => {},
      });
      return null;
    }

    function LateHarness() {
      const [showLate, setShowLate] = useState(false);
      const current = useCurrentOverlay();
      useCommand({
        id: "test.show-late",
        title: "Show late",
        hotkey: "l",
        modes: ["cursor"],
        handler: () => setShowLate(true),
      });
      return (
        <box flexDirection="column">
          {showLate && <LateRegistrant />}
          {current}
        </box>
      );
    }

    testSetup = await testRender(
      <TooeeProvider>
        <LateHarness />
      </TooeeProvider>,
      { width: 80, height: 24, kittyKeyboard: true },
    );
    await testSetup.renderOnce();

    // Register a command well after the palette provider mounted, then open.
    await press(testSetup, "l");
    await press(testSetup, ":");
    // Filter down to the late command (the harness box only fits a few rows).
    for (const key of "arrival") {
      await press(testSetup, key);
    }
    expect(testSetup.captureCharFrame()).toContain("Late Arrival Command");
  });
});

// Harness that also renders the overlay content so mouse clicks can hit
// palette rows through the hit-grid.
function PaletteClickHarness({ onRun }: { onRun: (id: string) => void }) {
  const mode = useMode();
  const hasOverlay = useHasOverlay();
  const overlay = useCurrentOverlay();

  useCommand({
    id: "test.clickable",
    title: "Clickable Command",
    hotkey: "t",
    modes: ["cursor"],
    handler: () => onRun("test.clickable"),
  });

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`open:${hasOverlay}`} />
      {overlay}
    </box>
  );
}

function lineOf(frame: string, text: string): { x: number; y: number } {
  const lines = frame.split("\n");
  for (let y = 0; y < lines.length; y++) {
    const x = lines[y].indexOf(text);
    if (x >= 0) return { x, y };
  }
  return { x: -1, y: -1 };
}

async function setupClick(onRun: (id: string) => void) {
  const s = await testRender(
    <TooeeProvider>
      <PaletteClickHarness onRun={onRun} />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  );
  await s.renderOnce();
  return s;
}

describe("command palette mouse", () => {
  test("left-click on a palette row runs the command and closes the palette", async () => {
    const ran: string[] = [];
    testSetup = await setupClick((id) => ran.push(id));

    await press(testSetup, ":");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("open:true");
    const pos = lineOf(frame, "Clickable Command");
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(ran).toEqual(["test.clickable"]);
    const after = testSetup.captureCharFrame();
    expect(after).toContain("open:false");
  });

  test("right-click on a palette row does nothing", async () => {
    const ran: string[] = [];
    testSetup = await setupClick((id) => ran.push(id));

    await press(testSetup, ":");
    const frame = testSetup.captureCharFrame();
    const pos = lineOf(frame, "Clickable Command");
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.RIGHT);
    });
    await testSetup.renderOnce();

    expect(ran).toEqual([]);
    expect(testSetup.captureCharFrame()).toContain("open:true");
  });
});
