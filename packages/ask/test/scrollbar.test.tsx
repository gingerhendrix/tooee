import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { TooeeProvider } from "@tooee/shell";
import { testRender } from "../../../test/support/test-render.ts";
import { Ask } from "../src/ask.js";
import { AskOverlay } from "../src/ask-overlay.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const THUMB = "█";
const TRACK = "░";

// 30 uniquely-identifiable lines, far taller than the boxes used below.
const tallValue = Array.from({ length: 30 }, (_, i) => `L${String(i + 1).padStart(2, "0")}`).join(
  "\n",
);

const setupAsk = async function setupAsk(value: string, width = 40, height = 14) {
  const s = await testRender(
    <TooeeProvider initialMode="insert">
      <Ask prompt="Q" multiline defaultValue={value} />
    </TooeeProvider>,
    { height, kittyKeyboard: true, width },
  );
  await s.renderOnce();
  return s;
};

const setupOverlay = async function setupOverlay(value: string, width = 60, height = 20) {
  const s = await testRender(
    <TooeeProvider initialMode="insert">
      <AskOverlay
        prompt="Q"
        multiline
        defaultValue={value}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    </TooeeProvider>,
    { height, kittyKeyboard: true, width },
  );
  await s.renderOnce();
  return s;
};

const press = async function press(key: string, modifiers?: { ctrl?: boolean; shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressKey(key, modifiers);
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const pressEscape = async function pressEscape() {
  await act(async () => {
    testSetup.mockInput.pressEscape();
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const wheel = async function wheel(x: number, y: number, direction: "up" | "down") {
  await act(async () => {
    await testSetup.mockMouse.scroll(x, y, direction);
  });
  await testSetup.renderOnce();
};

describe("Ask overflow scrolling", () => {
  test("the tail of overflowing content is reachable (cursor follows to the bottom)", async () => {
    testSetup = await setupAsk(tallValue);
    const frame = testSetup.captureCharFrame();
    // The box is far smaller than 30 lines; the last line must still be visible.
    expect(frame).toContain("L30");
    expect(frame).not.toContain("L01");
  });

  test("the head of overflowing content is reachable via cursor-mode motions (gg)", async () => {
    testSetup = await setupAsk(tallValue);
    await pressEscape();
    await press("g");
    await press("g");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("L01");
    expect(frame).not.toContain("L30");
  });

  test("the mouse wheel scrolls overflowing content", async () => {
    testSetup = await setupAsk(tallValue);
    await pressEscape();
    await press("g");
    await press("g");
    expect(testSetup.captureCharFrame()).toContain("L01");

    // Wheel down over the editor should reveal content further down.
    await wheel(10, 6, "down");
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain("L01");
  });

  test("a scrollbar thumb is shown when content overflows", async () => {
    testSetup = await setupAsk(tallValue);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain(THUMB);
    expect(frame).toContain(TRACK);
  });

  test("no scrollbar is shown when content fits", async () => {
    testSetup = await setupAsk("one\ntwo\nthree", 40, 20);
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain(THUMB);
    expect(frame).not.toContain(TRACK);
  });

  test("the scrollbar thumb moves as the viewport scrolls", async () => {
    testSetup = await setupAsk(tallValue);

    // Cursor starts at the end -> thumb sits at the bottom of the track.
    const bottomThumbRow = thumbRow(testSetup.captureCharFrame());

    await pressEscape();
    await press("g");
    await press("g");
    const topThumbRow = thumbRow(testSetup.captureCharFrame());

    expect(topThumbRow).toBeLessThan(bottomThumbRow);
  });
});

describe("AskOverlay overflow scrolling", () => {
  test("the tail of overflowing content is reachable", async () => {
    testSetup = await setupOverlay(tallValue);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("L30");
    expect(frame).not.toContain("L01");
  });

  test("the head is reachable via gg and a scrollbar thumb is shown", async () => {
    testSetup = await setupOverlay(tallValue);
    expect(testSetup.captureCharFrame()).toContain(THUMB);

    await pressEscape();
    await press("g");
    await press("g");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("L01");
    expect(frame).not.toContain("L30");
  });

  test("no scrollbar when content fits", async () => {
    testSetup = await setupOverlay("one\ntwo\nthree");
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain(THUMB);
    expect(frame).not.toContain(TRACK);
  });
});

/** Index of the first frame row that contains a thumb character. */
const thumbRow = function thumbRow(frame: string): number {
  const rows = frame.split("\n");
  const idx = rows.findIndex((row) => row.includes(THUMB));
  if (idx === -1) {
    throw new Error("no thumb found in frame");
  }
  return idx;
};
