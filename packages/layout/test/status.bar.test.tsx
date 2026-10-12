import { test, expect, afterEach } from "bun:test";

import { testRender } from "@tooee/test-support";
import { ThemeSwitcherProvider } from "@tooee/themes";

import { StatusBar } from "../src/status-bar.js";
import type { StatusBarItem } from "../src/status-bar.js";
import { chatItems, documentItems } from "./status-bar-fixtures.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test("renders label:value pairs", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar items={[{ label: "Mode", value: "cursor" }]} />
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 }
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
    { height: 24, width: 80 }
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
    { height: 24, width: 80 }
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
    { height: 3, width: 60 }
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toMatchSnapshot();
});

const renderRows = async function renderRows(
  items: readonly StatusBarItem[],
  width: number
): Promise<string[]> {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar items={items} />
    </ThemeSwitcherProvider>,
    { height: 3, width }
  );
  await testSetup.renderOnce();

  return testSetup.captureCharFrame().split("\n");
};

for (const width of [120, 80, 60, 40]) {
  test(`stays on one row at ${width} columns`, async () => {
    const rows = await renderRows(chatItems, width);

    expect(rows[0]?.trim()).not.toBe("");
    expect(rows[1]?.trim()).toBe("");
  });

  test(`chat items snapshot at ${width} columns`, async () => {
    const rows = await renderRows(chatItems, width);

    expect(rows[0]).toMatchSnapshot();
  });

  test(`document items snapshot at ${width} columns`, async () => {
    const rows = await renderRows(documentItems, width);

    expect(rows[0]).toMatchSnapshot();
  });
}

test("the end group touches the right padding", async () => {
  const rows = await renderRows(documentItems, 120);

  expect(rows[0]?.endsWith("Cursor: 412 ")).toBe(true);
});

test("shows the hidden-item marker when items hide", async () => {
  const rows = await renderRows(documentItems, 60);

  expect(rows[0]).toContain("⋯");
});

test("a width prop overrides the terminal width", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar items={documentItems} width={40} hiddenMarker={false} />
    </ThemeSwitcherProvider>,
    { height: 3, width: 120 }
  );
  await testSetup.renderOnce();
  const row = testSetup.captureCharFrame().split("\n")[0] ?? "";

  expect(row.slice(0, 40)).toEndWith("Ln 412 ");
  expect(row.slice(40).trim()).toBe("");
  expect(row).not.toContain("⋯");
});
