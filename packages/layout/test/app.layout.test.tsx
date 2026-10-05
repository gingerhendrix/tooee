import { test, expect, afterEach } from "bun:test";

import type { ScrollBoxRenderable } from "@opentui/core";
import { testRender } from "@tooee/test-support";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { ToastProvider } from "@tooee/toasts";
import { createRef } from "react";

import { AppLayout } from "../src/app-layout.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test("renders title bar with title and subtitle", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <ToastProvider>
        <AppLayout
          titleBar={{ subtitle: "v1.0", title: "App Title" }}
          statusBar={{ items: [{ label: "OK" }] }}
        >
          <text content="body" />
        </AppLayout>
      </ToastProvider>
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 }
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("App Title");
  expect(frame).toContain("v1.0");
});

test("renders status bar with items", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <ToastProvider>
        <AppLayout statusBar={{ items: [{ label: "Mode", value: "cursor" }] }}>
          <text content="body" />
        </AppLayout>
      </ToastProvider>
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 }
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Mode");
  expect(frame).toContain("cursor");
});

test("renders children in scrollable area", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <ToastProvider>
        <AppLayout statusBar={{ items: [{ label: "OK" }] }}>
          <text content="Child Content Here" />
        </AppLayout>
      </ToastProvider>
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 }
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("Child Content Here");
});

test("renders a configured scrollbox through the scroll prop", async () => {
  const scrollRef = createRef<ScrollBoxRenderable>();
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <ToastProvider>
        <AppLayout
          scroll={{ focused: false, ref: scrollRef, stickyScroll: true, stickyStart: "bottom" }}
          statusBar={{ items: [{ label: "OK" }] }}
        >
          <text content="Scrollable content" />
        </AppLayout>
      </ToastProvider>
    </ThemeSwitcherProvider>,
    { height: 24, width: 80 }
  );
  await testSetup.renderOnce();

  expect(scrollRef.current).not.toBeNull();
  expect(testSetup.captureCharFrame()).toContain("Scrollable content");
});

test("snapshot full layout", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <ToastProvider>
        <AppLayout
          titleBar={{ subtitle: "snapshot", title: "Test App" }}
          statusBar={{
            items: [
              { label: "Mode", value: "cmd" },
              { label: "Line", value: "1" },
            ],
          }}
        >
          <text content="Main content area" />
        </AppLayout>
      </ToastProvider>
    </ThemeSwitcherProvider>,
    { height: 10, width: 60 }
  );
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toMatchSnapshot();
});

test("renders the aside to the right of the content, between the bars", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <ToastProvider>
        <AppLayout
          titleBar={{ title: "App Title" }}
          statusBar={{ items: [{ label: "Status" }] }}
          aside={
            <box style={{ flexShrink: 0, width: 12 }}>
              <text content="Side panel" />
            </box>
          }
        >
          <text content="Main body" />
        </AppLayout>
      </ToastProvider>
    </ThemeSwitcherProvider>,
    { height: 10, width: 60 }
  );
  await testSetup.renderOnce();
  const lines = testSetup.captureCharFrame().split("\n");
  const row = lines.findIndex((line) => line.includes("Main body"));
  expect(row).toBeGreaterThan(0);
  expect(lines[row]).toContain("Side panel");
  expect(lines[row]?.indexOf("Side panel")).toBe(48);
  expect(lines[0]).toContain("App Title");
  expect(lines.some((line) => line.includes("Status"))).toBe(true);
});
