import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe, beforeEach } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { TooeeProvider, useThemeCommands } from "@tooee/shell";
import { useTheme } from "@tooee/themes";
import { useCurrentOverlay } from "@tooee/overlays";
import { useMode } from "@tooee/commands";
import { ensureTestConfigHome, resetTestConfig } from "../../../test/support/test-config.js";
import { press, pressArrow, pressEnter, pressEscape } from "./support/test-helpers.ts";
import type { TestSession } from "./support/test-helpers.ts";

const CONFIG_NAMESPACE = "shell-theme-picker";
const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);
process.env.XDG_CONFIG_HOME = TEST_CONFIG_HOME;

beforeEach(() => {
  resetTestConfig(CONFIG_NAMESPACE);
});

function ThemePickerHarness() {
  const { name: themeName, picker } = useThemeCommands();
  const mode = useMode();
  const { name: activeTheme } = useTheme();
  const overlay = useCurrentOverlay();

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`open:${picker.isOpen}`} />
      <text content={`theme:${themeName}`} />
      <text content={`active:${activeTheme}`} />
      {overlay}
    </box>
  );
}

async function setup() {
  const s = await testRender(
    <TooeeProvider>
      <ThemePickerHarness />
    </TooeeProvider>,
    { width: 80, height: 40, kittyKeyboard: true },
  );
  await s.renderOnce();
  return s;
}

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("theme picker", () => {
  test("t opens theme picker without mutating root mode", async () => {
    testSetup = await setup();
    expect(testSetup.captureCharFrame()).toContain("open:false");
    await press(testSetup, "t");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("open:true");
    expect(frame).toContain("mode:cursor");
  });

  test("Escape closes picker and reverts theme", async () => {
    testSetup = await setup();
    const initialFrame = testSetup.captureCharFrame();
    const initialTheme = initialFrame.match(/active:(\S+)/)?.[1];

    await press(testSetup, "t");
    expect(testSetup.captureCharFrame()).toContain("open:true");

    // Navigate down to preview a different theme
    await pressArrow(testSetup, "down");
    const afterNav = testSetup.captureCharFrame();
    const previewedTheme = afterNav.match(/active:(\S+)/)?.[1];
    // Theme should have changed during preview
    expect(previewedTheme).not.toBe(initialTheme);

    // Press Escape to cancel
    await pressEscape(testSetup);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("open:false");
    expect(frame).toContain("mode:cursor");
    expect(frame).toContain(`active:${initialTheme}`);
  });

  test("Enter confirms theme selection", async () => {
    testSetup = await setup();
    await press(testSetup, "t");
    expect(testSetup.captureCharFrame()).toContain("open:true");

    // Navigate down to a different theme
    await pressArrow(testSetup, "down");

    // Get the previewed theme before confirming
    const previewFrame = testSetup.captureCharFrame();
    const previewedTheme = previewFrame.match(/active:(\S+)/)?.[1];

    // Confirm
    await pressEnter(testSetup);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("open:false");
    expect(frame).toContain("mode:cursor");
    // Theme should stay at the previewed value
    expect(frame).toContain(`active:${previewedTheme}`);
  });

  test("picker shows theme entries", async () => {
    testSetup = await setup();
    await press(testSetup, "t");
    const openFrame = testSetup.captureCharFrame();
    expect(openFrame).toContain("open:true");
    // Should show at least the first theme in the list
    expect(openFrame).toContain("aura");
    // Should show filter count
    expect(openFrame).toMatch(/\d+/);
  });

  test("left-click on a theme row applies that theme and closes the picker", async () => {
    testSetup = await setup();
    const initialTheme = testSetup.captureCharFrame().match(/active:(\S+)/)?.[1];
    const target = initialTheme === "dracula" ? "cobalt2" : "dracula";

    await press(testSetup, "t");
    expect(testSetup.captureCharFrame()).toContain("open:true");

    // Narrow the list so the target theme is the visible row (the headless
    // picker viewport only shows the top of the list).
    for (const ch of target) {
      await press(testSetup, ch);
    }

    // Find the target theme row inside the picker list (start below the
    // harness status lines and the picker's filter row).
    const frame = testSetup.captureCharFrame();
    const lines = frame.split("\n");
    let pos = { x: -1, y: -1 };
    for (let y = 4; y < lines.length; y++) {
      const x = lines[y].indexOf(target);
      if (x >= 0) {
        pos = { x, y };
        break;
      }
    }
    expect(pos.y).toBeGreaterThan(-1);

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    const after = testSetup.captureCharFrame();
    expect(after).toContain("open:false");
    expect(after).toContain(`active:${target}`);
  });
});
