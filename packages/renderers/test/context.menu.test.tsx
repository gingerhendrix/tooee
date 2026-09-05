import { testRender } from "@tooee/test-support";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { CommandProvider } from "@tooee/commands";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { ContextMenu } from "../src/context-menu.js";
import type { ContextMenuEntry } from "../src/context-menu.js";
import type { ComponentProps, ReactNode } from "react";

const ENTRIES: ContextMenuEntry[] = [
  { hotkey: "y", id: "copy", title: "Copy row" },
  { id: "open", title: "Open" },
  { id: "delete", title: "Delete" },
];

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

interface FramePosition {
  x: number;
  y: number;
}

const lineOf = function lineOf(frame: string, text: string): FramePosition {
  const lines = frame.split("\n");
  for (let y = 0; y < lines.length; y += 1) {
    const x = lines[y].indexOf(text);
    if (x !== -1) {
      return { x, y };
    }
  }
  return { x: -1, y: -1 };
};

const ContextMenuHarness = function ContextMenuHarness(
  props: ComponentProps<typeof ContextMenu>,
): ReactNode {
  return (
    <CommandProvider initialMode="insert">
      <ThemeSwitcherProvider>
        <ContextMenu {...props} />
      </ThemeSwitcherProvider>
    </CommandProvider>
  );
};

describe("ContextMenu", () => {
  test("renders all entries", async () => {
    testSetup = await testRender(
      <ContextMenuHarness entries={ENTRIES} x={4} y={2} onSelect={() => {}} onClose={() => {}} />,
      { height: 20, width: 50 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Copy row");
    expect(frame).toContain("Open");
    expect(frame).toContain("Delete");
  });

  test("click on an entry calls onSelect with its id", async () => {
    const selected: string[] = [];
    testSetup = await testRender(
      <ContextMenuHarness
        entries={ENTRIES}
        x={4}
        y={2}
        onSelect={(id) => {
          selected.push(id);
        }}
        onClose={() => {}}
      />,
      { height: 20, width: 50 },
    );
    await testSetup.renderOnce();
    const pos = lineOf(testSetup.captureCharFrame(), "Delete");
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();
    expect(selected).toEqual(["delete"]);
  });

  test("j then Enter selects the second entry", async () => {
    const selected: string[] = [];
    testSetup = await testRender(
      <ContextMenuHarness
        entries={ENTRIES}
        x={4}
        y={2}
        onSelect={(id) => {
          selected.push(id);
        }}
        onClose={() => {}}
      />,
      { height: 20, width: 50 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      testSetup.mockInput.pressKey("j");
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    await act(async () => {
      testSetup.mockInput.pressEnter();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    expect(selected).toEqual(["open"]);
  });

  test("clicking the backdrop calls onClose", async () => {
    let closed = 0;
    testSetup = await testRender(
      <ContextMenuHarness
        entries={ENTRIES}
        x={4}
        y={2}
        onSelect={() => {}}
        onClose={() => {
          closed += 1;
        }}
      />,
      { height: 20, width: 50 },
    );
    await testSetup.renderOnce();
    // Click far from the menu panel (bottom-right corner) → backdrop.
    await act(async () => {
      await testSetup.mockMouse.click(48, 18, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();
    expect(closed).toBe(1);
  });

  test("clamps the panel on-screen near the bottom-right corner", async () => {
    testSetup = await testRender(
      <ContextMenuHarness entries={ENTRIES} x={48} y={19} onSelect={() => {}} onClose={() => {}} />,
      { height: 20, width: 50 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    // Menu must remain fully visible despite the anchor being in the corner.
    expect(frame).toContain("Copy row");
    expect(frame).toContain("Delete");
  });
});
