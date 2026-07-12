import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach, beforeEach } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { TooeeProvider } from "@tooee/shell";
import { ensureTestConfigHome, resetTestConfig } from "../../../test/support/test-config.js";
import { ChooseOverlay } from "../src/ChooseOverlay.js";
import type { ChooseItem } from "../src/types.js";

const CONFIG_NAMESPACE = "choose-overlay-mouse";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);
process.env.XDG_CONFIG_HOME = TEST_CONFIG_HOME;

beforeEach(() => {
  resetTestConfig(CONFIG_NAMESPACE);
});

const ITEMS: ChooseItem[] = [{ text: "alpha" }, { text: "beta" }, { text: "gamma" }];

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

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

const setup = async function setup(opts: {
  onSelect?: (item: ChooseItem) => void;
  onCancel?: () => void;
}) {
  const s = await testRender(
    <TooeeProvider initialMode="insert">
      <ChooseOverlay
        items={ITEMS}
        prompt="pick one"
        onSelect={opts.onSelect ?? (() => {})}
        onCancel={opts.onCancel ?? (() => {})}
      />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 60 },
  );
  await s.renderOnce();
  return s;
};

describe("ChooseOverlay mouse", () => {
  test("left-click on a row selects that item (same path as Enter)", async () => {
    const selected: ChooseItem[] = [];
    testSetup = await setup({ onSelect: (item) => selected.push(item) });

    const frame = testSetup.captureCharFrame();
    const pos = lineOf(frame, "beta");
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(selected.map((i) => i.text)).toEqual(["beta"]);
  });

  test("right-click on a row does not select", async () => {
    const selected: ChooseItem[] = [];
    testSetup = await setup({ onSelect: (item) => selected.push(item) });

    const frame = testSetup.captureCharFrame();
    const pos = lineOf(frame, "gamma");
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.RIGHT);
    });
    await testSetup.renderOnce();

    expect(selected).toEqual([]);
  });
});
