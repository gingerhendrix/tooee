import { test, expect, afterEach, beforeEach, describe } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { ColorMode } from "@tooee/config";
import { TooeeProvider } from "@tooee/shell";
import { testRender, ensureTestConfigHome, resetTestConfig } from "@tooee/test-support";
import type { TestSession } from "@tooee/test-support";
import { useTheme, useThemeSwitcher } from "@tooee/themes";
import { act } from "react";
import type { ReactNode } from "react";

const CONFIG_NAMESPACE = "shell-theme-mode";

const TEST_CONFIG_HOME = ensureTestConfigHome(CONFIG_NAMESPACE);

process.env.XDG_CONFIG_HOME = TEST_CONFIG_HOME;

let switchMode: ((mode: ColorMode, opts?: { persist?: boolean }) => void) | null = null;

const ModeHarness = function ModeHarness(): ReactNode {
  const switcher = useThemeSwitcher();
  const { mode } = useTheme();
  switchMode = switcher.setMode;

  return <text content={`mode:${mode}`} />;
};

let session: TestSession;

beforeEach(() => {
  resetTestConfig(CONFIG_NAMESPACE);
});

afterEach(() => {
  session?.renderer.destroy();
  switchMode = null;
});

const setup = async function setup() {
  session = await testRender(
    <TooeeProvider>
      <ModeHarness />
    </TooeeProvider>,
    { height: 4, width: 40 }
  );
  await session.renderOnce();
};

const changeMode = async function changeMode(mode: ColorMode, opts?: { persist?: boolean }) {
  await act(async () => {
    switchMode?.(mode, opts);
    await Promise.resolve();
  });
  await session.renderOnce();
};

describe("useThemeSwitcher setMode", () => {
  test("switches the colour mode at runtime", async () => {
    await setup();
    expect(session.captureCharFrame()).toContain("mode:dark");

    await changeMode("light");

    expect(session.captureCharFrame()).toContain("mode:light");
  });

  test("persists the mode only when asked", async () => {
    await setup();
    const configPath = path.join(TEST_CONFIG_HOME, "tooee", "config.json");

    await changeMode("light");
    expect(() => readFileSync(configPath, "utf-8")).toThrow();

    await changeMode("light", { persist: true });
    expect(readFileSync(configPath, "utf-8")).toContain('"mode": "light"');
  });
});
