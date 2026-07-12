import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { TooeeProvider } from "@tooee/shell";
import { View } from "../src/View.js";
import type { AnyContent, ContentProvider, ContentRenderer } from "../src/types.js";

const CONTENT: AnyContent = {
  data: {},
  format: "chart",
  getTextContent: () => "a\nb\nc\nd",
};

const PROVIDER: ContentProvider = { format: "chart", load: () => CONTENT };

// A renderer with its own markup: it resolves its own row and asks the
// controller to select it.
const RENDERER: ContentRenderer = ({ document }): React.ReactNode => (
  <box onMouseDown={() => document.selectRow(2)}>
    <text content="CUSTOM-BODY" />
  </box>
);

// A renderer that reads controller state rather than a bag of cursor numbers.
const STATE_RENDERER: ContentRenderer = ({ document }): React.ReactNode => (
  <box>
    <text content={`active:${document.activeIndex}`} />
    <text content={`rows:${document.rows.length}`} />
  </box>
);

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

const setup = async function setup(renderer: ContentRenderer) {
  const s = await testRender(
    <TooeeProvider>
      <View contentProvider={PROVIDER} renderers={{ chart: renderer }} />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await s.renderOnce();
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100));
  });
  await s.renderOnce();
  return s;
};

describe("Custom renderer document bindings", () => {
  test("a custom renderer can select a row via document.selectRow", async () => {
    testSetup = await setup(RENDERER);

    const frame0 = testSetup.captureCharFrame();
    expect(frame0).toMatch(/Cursor:\s*0/u);
    const pos = lineOf(frame0, "CUSTOM-BODY");
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*2/u);
  });

  test("selectRow stands down while a modal overlay is open", async () => {
    testSetup = await setup(RENDERER);
    const pos = lineOf(testSetup.captureCharFrame(), "CUSTOM-BODY");

    await act(async () => {
      testSetup.mockInput.pressKey("t");
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Filter themes");

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    await act(async () => {
      testSetup.mockInput.pressEscape();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain("Filter themes");
    expect(frame).toMatch(/Cursor:\s*0/u);
  });

  test("a custom renderer reads cursor and rows from the controller", async () => {
    testSetup = await setup(STATE_RENDERER);
    expect(testSetup.captureCharFrame()).toContain("rows:4");
    expect(testSetup.captureCharFrame()).toContain("active:0");

    await act(async () => {
      testSetup.mockInput.pressKey("j");
    });
    await testSetup.renderOnce();

    expect(testSetup.captureCharFrame()).toContain("active:1");
  });
});
