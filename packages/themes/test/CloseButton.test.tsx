import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { ThemeSwitcherProvider } from "../src/context.js";
import { CloseButton } from "../src/CloseButton.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test("renders the close glyph", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <CloseButton onClose={() => {}} />
    </ThemeSwitcherProvider>,
    { width: 20, height: 5 },
  );
  await testSetup.renderOnce();
  expect(testSetup.captureCharFrame()).toContain("✕");
});

test("left-click invokes onClose", async () => {
  let closed = 0;
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <box paddingLeft={2} paddingTop={1}>
        <CloseButton onClose={() => closed++} />
      </box>
    </ThemeSwitcherProvider>,
    { width: 20, height: 5 },
  );
  await testSetup.renderOnce();

  // Glyph sits at paddingLeft(2 outer) + paddingLeft(1 in CloseButton) = x≈3, y=1
  await act(async () => {
    await testSetup.mockMouse.click(3, 1, MouseButtons.LEFT);
  });
  await testSetup.renderOnce();
  expect(closed).toBe(1);
});

test("right-click does not invoke onClose", async () => {
  let closed = 0;
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <box paddingLeft={2} paddingTop={1}>
        <CloseButton onClose={() => closed++} />
      </box>
    </ThemeSwitcherProvider>,
    { width: 20, height: 5 },
  );
  await testSetup.renderOnce();
  await act(async () => {
    await testSetup.mockMouse.click(3, 1, MouseButtons.RIGHT);
  });
  await testSetup.renderOnce();
  expect(closed).toBe(0);
});
