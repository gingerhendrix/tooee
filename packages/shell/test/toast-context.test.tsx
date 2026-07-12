import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach } from "bun:test";
import { act } from "react";
import { TooeeProvider } from "@tooee/shell";
import { useCommand } from "@tooee/commands";
import { useToast } from "@tooee/toasts";
import type { TestSession } from "./support/test-helpers.ts";

const ToastContextHarness = function ToastContextHarness(): React.ReactNode {
  const { currentToast } = useToast();

  useCommand({
    handler: (ctx) => {
      ctx.toast.toast({ level: "success", message: "from context" });
    },
    hotkey: "1",
    id: "test.toast-via-ctx",
    modes: ["cursor"],
    title: "Toast via context",
  });

  useCommand({
    handler: (ctx) => {
      ctx.toast.dismiss();
    },
    hotkey: "2",
    id: "test.dismiss-via-ctx",
    modes: ["cursor"],
    title: "Dismiss via context",
  });

  return (
    <box>
      <text
        content={
          currentToast
            ? `ctx-toast:${currentToast.level}:${currentToast.message}`
            : "ctx-toast:none"
        }
      />
    </box>
  );
};

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

test("ctx.toast is available in command handlers", async () => {
  testSetup = await testRender(
    <TooeeProvider>
      <ToastContextHarness />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 60 },
  );
  await testSetup.renderOnce();
  expect(testSetup.captureCharFrame()).toContain("ctx-toast:none");

  await act(async () => {
    testSetup.mockInput.pressKey("1");
    await Promise.resolve();
  });
  await testSetup.renderOnce();
  const frame = testSetup.captureCharFrame();
  expect(frame).toContain("ctx-toast:success:from context");
});

test("ctx.toast.dismiss works from command handler", async () => {
  testSetup = await testRender(
    <TooeeProvider>
      <ToastContextHarness />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 60 },
  );
  await testSetup.renderOnce();

  // Show a toast
  await act(async () => {
    testSetup.mockInput.pressKey("1");
    await Promise.resolve();
  });
  await testSetup.renderOnce();
  expect(testSetup.captureCharFrame()).toContain("ctx-toast:success:from context");

  // Dismiss it
  await act(async () => {
    testSetup.mockInput.pressKey("2");
    await Promise.resolve();
  });
  await testSetup.renderOnce();
  expect(testSetup.captureCharFrame()).toContain("ctx-toast:none");
});
