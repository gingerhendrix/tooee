import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach } from "bun:test";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { StatusBar } from "../src/StatusBar.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test("renders label:value pairs", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar items={[{ label: "Mode", value: "cursor" }]} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Mode");
  expect(frame).toContain("cursor");
});

test("renders multiple items", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar
        items={[
          { label: "Mode", value: "cursor" },
          { label: "Line", value: "42" },
        ]}
      />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Mode");
  expect(frame).toContain("cursor");
  expect(frame).toContain("Line");
  expect(frame).toContain("42");
});

test("renders label without value", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar items={[{ label: "Ready" }]} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Ready");
});

test("snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar
        items={[
          { label: "Mode", value: "cursor" },
          { label: "Theme", value: "dracula" },
        ]}
      />
    </ThemeSwitcherProvider>,
    { height: 3, width: 60 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toMatchSnapshot();
});
