import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { CodeView } from "../src/CodeView.js";
import { useRowMouseBindings, type RowMouseCallbacks } from "./support/bindings.js";

// The code view is a single `<code>` provider inside a row-document with no
// header chrome, so the first line renders at viewport y=0. Gutter is line
// numbers (1 digit) + sign column (3) + padding (1) = 5, so x=8 lands on code.
const CODE = ["const a = 1", "const b = 2", "const c = 3", "const d = 4", "const e = 5"].join("\n");
const CONTENT_X = 8;

function CodeHarness(callbacks: RowMouseCallbacks) {
  return <CodeView content={CODE} document={useRowMouseBindings(callbacks)} />;
}

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("CodeView mouse interaction", () => {
  test("left-click maps click Y to the line index", async () => {
    const clicked: number[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <CodeHarness onRowClick={(i) => clicked.push(i)} />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 0, MouseButtons.LEFT);
    });
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 3, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(clicked).toEqual([0, 3]);
  });

  test("clicking the line-number gutter also selects the line", async () => {
    const clicked: number[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <CodeHarness onRowClick={(i) => clicked.push(i)} />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockMouse.click(0, 2, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(clicked).toEqual([2]);
  });

  test("right-click reports the line index and coordinates", async () => {
    const events: { index: number; x: number; y: number }[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <CodeHarness onRowContextMenu={(index, x, y) => events.push({ index, x, y })} />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 1, MouseButtons.RIGHT);
    });
    await testSetup.renderOnce();

    expect(events.length).toBe(1);
    expect(events[0]!.index).toBe(1);
    expect(events[0]!.x).toBe(CONTENT_X);
    expect(events[0]!.y).toBe(1);
  });

  test("clicking below the last line does nothing", async () => {
    const clicked: number[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <CodeHarness onRowClick={(i) => clicked.push(i)} />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 12, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(clicked).toEqual([]);
  });
});
