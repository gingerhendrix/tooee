import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach } from "bun:test";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { TitleBar } from "../src/title-bar.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test("renders title text", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <TitleBar title="My Title" />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("My Title");
});

test("renders subtitle when provided", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <TitleBar title="My Title" subtitle="A subtitle" />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("My Title");
  expect(frame).toContain("A subtitle");
});

test("does not render subtitle when not provided", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <TitleBar title="Only Title" />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Only Title");
  expect(frame).not.toContain("—");
});

test("snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <TitleBar title="Snapshot Title" subtitle="Sub" />
    </ThemeSwitcherProvider>,
    { height: 3, width: 60 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toMatchSnapshot();
});
