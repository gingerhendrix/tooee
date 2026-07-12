import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { ContextMenu } from "../src/ContextMenu.js";
import type { ContextMenuEntry } from "../src/ContextMenu.js";

const ENTRIES: ContextMenuEntry[] = [
  { hotkey: "y", id: "copy", title: "Copy row" },
  { id: "open", title: "Open" },
  { id: "delete", title: "Delete" },
];

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const lineOf = function lineOf(frame: string, text: string): { x: number; y: number } {
  const lines = frame.split("\n");
  for (let y = 0; y < lines.length; y++) {
    const x = lines[y].indexOf(text);
    if (x >= 0) {
      return { x, y };
    }
  }
  return { x: -1, y: -1 };
};

describe("ContextMenu", () => {
  test("renders all entries", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <ContextMenu entries={ENTRIES} x={4} y={2} onSelect={() => {}} onClose={() => {}} />
      </ThemeSwitcherProvider>,
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
      <ThemeSwitcherProvider>
        <ContextMenu
          entries={ENTRIES}
          x={4}
          y={2}
          onSelect={(id) => selected.push(id)}
          onClose={() => {}}
        />
      </ThemeSwitcherProvider>,
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
      <ThemeSwitcherProvider>
        <ContextMenu
          entries={ENTRIES}
          x={4}
          y={2}
          onSelect={(id) => selected.push(id)}
          onClose={() => {}}
        />
      </ThemeSwitcherProvider>,
      { height: 20, width: 50 },
    );
    await testSetup.renderOnce();

    await act(() => {
      testSetup.mockInput.pressKey("j");
    });
    await testSetup.renderOnce();
    await act(() => {
      testSetup.mockInput.pressEnter();
    });
    await testSetup.renderOnce();
    expect(selected).toEqual(["open"]);
  });

  test("clicking the backdrop calls onClose", async () => {
    let closed = 0;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <ContextMenu entries={ENTRIES} x={4} y={2} onSelect={() => {}} onClose={() => closed++} />
      </ThemeSwitcherProvider>,
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
      <ThemeSwitcherProvider>
        <ContextMenu entries={ENTRIES} x={48} y={19} onSelect={() => {}} onClose={() => {}} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 50 },
    );
    await testSetup.renderOnce();
    const frame = testSetup.captureCharFrame();
    // Menu must remain fully visible despite the anchor being in the corner.
    expect(frame).toContain("Copy row");
    expect(frame).toContain("Delete");
  });
});
