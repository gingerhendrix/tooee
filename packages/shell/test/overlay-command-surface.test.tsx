import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { useState } from "react";
import { TooeeProvider, useQuitCommand } from "@tooee/shell";
import { useCommand, useMode, useSetMode, useActiveCommandSurface } from "@tooee/commands";
import { useOverlay, useCurrentOverlay } from "@tooee/overlays";
import type { OverlayCloseReason } from "@tooee/overlays";
import { press, pressEnter, pressEscape } from "./support/test-helpers.ts";
import type { TestSession } from "./support/test-helpers.ts";

const AskSurface = function AskSurface({
  onSubmit,
  onCancel,
}: {
  onSubmit: (value: string) => void;
  onCancel: () => void;
}): React.ReactNode {
  const mode = useMode();
  const setMode = useSetMode();

  useCommand({
    handler: () => onSubmit("hello"),
    hotkey: "Enter",
    id: "ask.submit",
    title: "Submit",
  });
  useCommand({ handler: onCancel, hotkey: "Escape", id: "ask.cancel", title: "Cancel" });
  useCommand({
    handler: () => setMode("insert"),
    hotkey: "i",
    id: "ask.insert",
    title: "Insert mode",
  });

  return (
    <box flexDirection="column">
      <text content="ASK_OVERLAY" />
      <text content={`askmode:${mode}`} />
    </box>
  );
};

const PassiveSurface = function PassiveSurface({
  onAction,
}: {
  onAction: () => void;
}): React.ReactNode {
  // Bound to the same hotkey the root uses to prove passive surfaces never win.
  useCommand({ handler: onAction, hotkey: "q", id: "passive.quit-like", title: "Passive" });
  return <text content="PASSIVE_OVERLAY" />;
};

const Harness = function Harness(): React.ReactNode {
  const overlay = useOverlay();
  const current = useCurrentOverlay();
  const mode = useMode();
  const active = useActiveCommandSurface();

  const [quit, setQuit] = useState(0);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(0);
  const [passiveAction, setPassiveAction] = useState(0);

  useQuitCommand({ onQuit: () => setQuit((n) => n + 1) });

  useCommand({
    handler: () => {
      overlay.open(
        "ask",
        ({ close }: { close: (reason?: OverlayCloseReason) => void }): React.ReactNode => (
          <AskSurface
            onSubmit={(value) => {
              setSubmitted(value);
              close();
            }}
            onCancel={() => {
              setCancelled((n) => n + 1);
              close("escape");
            }}
          />
        ),
        null,
        { ownCommands: true, role: "modal", surfaceMode: "cursor" },
      );
    },
    hotkey: "o",
    id: "open-ask",
    title: "Open ask",
  });

  useCommand({
    handler: () => {
      overlay.open(
        "passive",
        (): React.ReactNode => <PassiveSurface onAction={() => setPassiveAction((n) => n + 1)} />,
        null,
        { ownCommands: true, role: "passive" },
      );
    },
    hotkey: "p",
    id: "open-passive",
    title: "Open passive",
  });

  return (
    <box flexDirection="column">
      <text content={`rootmode:${mode}`} />
      <text content={`active:${active ? active.id : "root"}`} />
      <text content={`quit:${quit}`} />
      <text content={`submitted:${submitted ?? "none"}`} />
      <text content={`cancelled:${cancelled}`} />
      <text content={`passiveAction:${passiveAction}`} />
      {current}
    </box>
  );
};

const setup = async function setup() {
  const session = await testRender(
    <TooeeProvider>
      <Harness />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await session.renderOnce();
  return session;
};

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("overlay-owned command surfaces", () => {
  test("opening a modal overlay makes it the active command surface", async () => {
    testSetup = await setup();
    expect(testSetup.captureCharFrame()).toContain("active:root");
    await press(testSetup, "o");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("ASK_OVERLAY");
    expect(frame).toContain("active:ask");
  });

  test("parent quit cannot fire while a modal overlay is active", async () => {
    testSetup = await setup();
    await press(testSetup, "o");
    await press(testSetup, "q"); // root quit hotkey, but overlay has no 'q' command
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("quit:0"); // parent quit suspended
    expect(frame).toContain("ASK_OVERLAY"); // overlay still open
  });

  test("overlay submit command fires and closes the overlay", async () => {
    testSetup = await setup();
    await press(testSetup, "o");
    await pressEnter(testSetup);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("submitted:hello");
    expect(frame).not.toContain("ASK_OVERLAY");
    expect(frame).toContain("active:root");
  });

  test("Escape is handled by the overlay's own cancel command", async () => {
    testSetup = await setup();
    await press(testSetup, "o");
    await pressEscape(testSetup);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("cancelled:1");
    expect(frame).not.toContain("ASK_OVERLAY");
  });

  test("parent command dispatch resumes after the overlay closes", async () => {
    testSetup = await setup();
    await press(testSetup, "o");
    await pressEscape(testSetup); // close via overlay cancel
    await press(testSetup, "q"); // root quit works again
    expect(testSetup.captureCharFrame()).toContain("quit:1");
  });

  test("local overlay mode does not leak into the root mode", async () => {
    testSetup = await setup();
    await press(testSetup, "o");
    await press(testSetup, "i"); // overlay: setMode("insert")
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("askmode:insert"); // overlay-local mode changed
    expect(frame).toContain("rootmode:cursor"); // host mode untouched
  });

  test("a passive overlay does not steal keyboard focus from the root", async () => {
    testSetup = await setup();
    await press(testSetup, "p");
    const opened = testSetup.captureCharFrame();
    expect(opened).toContain("PASSIVE_OVERLAY");
    expect(opened).toContain("active:root"); // passive overlay is not the keyboard owner

    await press(testSetup, "q"); // 'q' is bound on both root and the passive surface
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("quit:1"); // root quit fired
    expect(frame).toContain("passiveAction:0"); // passive surface command never fired
  });
});
