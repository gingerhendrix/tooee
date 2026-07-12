import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe, beforeEach } from "bun:test";
import { act } from "react";
import { TooeeProvider } from "@tooee/shell";
import { ensureTestConfigHome, resetTestConfig } from "../../../test/support/test-config.js";
import { Choose } from "../src/Choose.js";
import type { ChooseContentProvider } from "../src/types.js";

const CONFIG_NAMESPACE = "choose-overlay-guard";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);
process.env.XDG_CONFIG_HOME = TEST_CONFIG_HOME;

beforeEach(() => {
  resetTestConfig(CONFIG_NAMESPACE);
});

const ITEMS = [
  { text: "alpha" },
  { text: "beta" },
  { text: "gamma" },
  { text: "delta" },
  { text: "epsilon" },
];

const makeProvider = function makeProvider(): ChooseContentProvider {
  return { load: () => ITEMS };
};

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const setup = async function setup(
  opts: { onConfirm?: (r: any) => void; onCancel?: () => void } = {},
) {
  const s = await testRender(
    <TooeeProvider initialMode="insert">
      <Choose
        contentProvider={makeProvider()}
        options={{ prompt: "pick" }}
        onConfirm={opts.onConfirm}
        onCancel={opts.onCancel}
      />
    </TooeeProvider>,
    { height: 30, kittyKeyboard: true, width: 80 },
  );
  await s.renderOnce();
  return s;
};

const press = async function press(s: TestSession, key: string, modifiers?: { ctrl?: boolean }) {
  await act(async () => {
    s.mockInput.pressKey(key, modifiers);
    await Promise.resolve();
  });
  await s.renderOnce();
};

const pressEscape = async function pressEscape(s: TestSession) {
  await act(async () => {
    s.mockInput.pressEscape();
    await Promise.resolve();
  });
  await s.renderOnce();
};

const pressEnter = async function pressEnter(s: TestSession) {
  await act(async () => {
    s.mockInput.pressEnter();
    await Promise.resolve();
  });
  await s.renderOnce();
};

const pressArrow = async function pressArrow(s: TestSession, direction: "up" | "down") {
  await act(async () => {
    s.mockInput.pressArrow(direction);
    await Promise.resolve();
  });
  await s.renderOnce();
};

/** Escape to cursor mode, then `t` to open the theme picker overlay. */
const openThemePicker = async function openThemePicker(s: TestSession) {
  await pressEscape(s);
  await press(s, "t");
  expect(s.captureCharFrame()).toContain("Filter themes...");
};

describe("Choose raw keyboard handler with theme picker open (R-01)", () => {
  test("Escape closes the picker without cancelling the app", async () => {
    let cancelled = 0;
    testSetup = await setup({
      onCancel: () => {
        cancelled += 1;
      },
    });
    await openThemePicker(testSetup);

    await pressEscape(testSetup);
    const frame = testSetup.captureCharFrame();
    expect(frame).not.toContain("Filter themes...");
    expect(cancelled).toBe(0);
  });

  test("Enter selects a theme without submitting the choose selection", async () => {
    let confirmed: any = null;
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r;
      },
    });
    await openThemePicker(testSetup);

    await pressEnter(testSetup);
    expect(confirmed).toBeNull();
    expect(testSetup.captureCharFrame()).not.toContain("Filter themes...");
  });

  test("arrows do not move the hidden choose list", async () => {
    let confirmed: any = null;
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r;
      },
    });
    await openThemePicker(testSetup);

    await pressArrow(testSetup, "down");
    await pressArrow(testSetup, "down");
    await pressEscape(testSetup);
    expect(testSetup.captureCharFrame()).not.toContain("Filter themes...");

    // Confirm in cursor mode: the active item must still be the first one.
    await pressEnter(testSetup);
    expect(confirmed).not.toBeNull();
    expect(confirmed.items[0].text).toBe("alpha");
  });

  test("ctrl+n/ctrl+p do not move the hidden choose list", async () => {
    let confirmed: any = null;
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r;
      },
    });
    await openThemePicker(testSetup);

    await press(testSetup, "n", { ctrl: true });
    await press(testSetup, "n", { ctrl: true });
    await pressEscape(testSetup);

    await pressEnter(testSetup);
    expect(confirmed).not.toBeNull();
    expect(confirmed.items[0].text).toBe("alpha");
  });
});
