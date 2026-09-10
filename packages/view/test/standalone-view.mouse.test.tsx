import { afterEach, expect, test } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { TooeeProvider } from "@tooee/shell";
import { testRender } from "@tooee/test-support";
import { StandaloneView } from "../src/standalone-view.js";
import { createFileProvider } from "../src/default-provider.js";

let setup: Awaited<ReturnType<typeof testRender>>;
afterEach(() => {
  setup?.renderer.destroy();
});
const settle = async () => {
  await act(async () => {
    await Bun.sleep(100);
  });
  await setup.renderOnce();
};
const click = async (text: string) => {
  const lines = setup.captureCharFrame().split("\n");
  const y = lines.findIndex((line) => line.includes(text));
  expect(y).toBeGreaterThan(-1);
  await act(async () => {
    await setup.mockMouse.click(lines[y].indexOf(text), y, MouseButtons.LEFT);
  });
  await settle();
};

test("real mouse links replace the provider and resolve against the current file", async () => {
  const filePath = `${import.meta.dir}/fixtures/links/start.md`;
  setup = await testRender(
    <TooeeProvider>
      <StandaloneView filePath={filePath} contentProvider={createFileProvider(filePath)} />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await settle();
  await click("Open linked document");
  expect(setup.captureCharFrame()).toContain("Navigation target");
  expect(setup.captureCharFrame()).toContain("target.md");
  await click("Continue journey");
  expect(setup.captureCharFrame()).toContain("Journey complete");
});
