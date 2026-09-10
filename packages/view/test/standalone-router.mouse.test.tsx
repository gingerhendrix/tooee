import { afterEach, expect, mock, test } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { TooeeProvider } from "@tooee/shell";
import { keyEvent, press, pressEnter, pressEscape, testRender } from "@tooee/test-support";
import { Outlet, RouterProvider } from "@tooee/router";
import { createStandaloneRouter } from "../src/standalone-router.js";
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
  const { router } = createStandaloneRouter({
    contentProvider: createFileProvider(filePath),
    filePath,
  });
  const startup = await router.start();
  expect(startup.status).toBe("committed");
  setup = await testRender(
    <TooeeProvider initialMode="cursor">
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await settle();
  await click("Missing document");
  expect(setup.captureCharFrame()).toContain("File not found: missing.md");
  await click("External website");
  expect(setup.captureCharFrame()).toContain("Unsupported link: https://example.com");
  await click("Open linked document");
  expect(setup.captureCharFrame()).toContain("Navigation target");
  expect(setup.captureCharFrame()).toContain("target.md");
  await click("Continue journey");
  expect(setup.captureCharFrame()).toContain("Journey complete");
  act(() => {
    setup.renderer.keyInput.emit("keypress", keyEvent("backspace"));
  });
  await settle();
  expect(setup.captureCharFrame()).toContain("Navigation target");
});

test("cursor Enter on a line with several links opens a chooser instead of taking the first", async () => {
  const filePath = `${import.meta.dir}/fixtures/links/start.md`;
  const { router } = createStandaloneRouter({
    contentProvider: createFileProvider(filePath),
    filePath,
  });
  await router.start();
  setup = await testRender(
    <TooeeProvider initialMode="cursor">
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await settle();
  await press(setup, "g", { shift: true });
  await pressEnter(setup);
  await settle();
  expect(setup.captureCharFrame()).toContain("Follow link");
  expect(setup.captureCharFrame()).toContain("Nested target");
  expect(setup.captureCharFrame()).toContain("Journey end");
  // The chooser opens in insert mode: the first Escape leaves it, the second cancels.
  await pressEscape(setup);
  await pressEscape(setup);
  await settle();
  expect(setup.captureCharFrame()).not.toContain("Follow link");
  expect(setup.captureCharFrame()).toContain("Link source");
  expect(router.stack).toHaveLength(1);
  await pressEnter(setup);
  await settle();
  await press(setup, "n", { ctrl: true });
  await pressEnter(setup);
  await settle();
  expect(setup.captureCharFrame()).toContain("Journey complete");
  expect(router.stack).toHaveLength(2);
});

test("stdin consumes links with an info toast without running custom handlers", async () => {
  const handler = mock(() => true);
  const { router } = createStandaloneRouter({
    contentProvider: {
      load: () => ({ format: "markdown", markdown: "[Local document](next.md)" }),
    },
    linkHandlers: [handler],
  });
  await router.start();
  setup = await testRender(
    <TooeeProvider initialMode="cursor">
      <RouterProvider router={router}>
        <Outlet />
      </RouterProvider>
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await settle();
  await click("Local document");
  expect(setup.captureCharFrame()).toContain("Links need a source file");
  expect(handler).not.toHaveBeenCalled();
  expect(router.stack).toHaveLength(1);
});
