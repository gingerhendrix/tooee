import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach } from "bun:test";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { CodeView } from "../src/CodeView.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test("renders code content", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <CodeView content={"function hello() {\n  return 42\n}"} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("function hello()");
  expect(frame).toContain("return 42");
});

test("shows line numbers by default", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <CodeView content={"line one\nline two\nline three"} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("1");
  expect(frame).toContain("2");
  expect(frame).toContain("3");
});

test("hides line numbers when disabled", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <CodeView content="only content" showLineNumbers={false} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("only content");
});

test("snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <CodeView content={"const x = 1\nconst y = 2"} language="js" />
    </ThemeSwitcherProvider>,
    { height: 8, width: 40 },
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toMatchSnapshot();
});
