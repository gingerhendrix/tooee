import { test, expect, afterEach, describe } from "bun:test";

import {
  CommandProvider,
  CommandSurfaceProvider,
  useActions,
  useCommand,
  useCommandGroup,
  useCommandSequenceState,
} from "@tooee/commands";
import type { CommandSequenceState, ParsedStep } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import { useCurrentOverlay, useHasModalOverlay, useHasOverlay } from "@tooee/overlays";
import { OverlayProvider, TooeeProvider, WhichKeyOverlay, WhichKeyProvider } from "@tooee/shell";
import { testRender, press, pressEscape } from "@tooee/test-support";
import type { TestSession } from "@tooee/test-support";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { ToastProvider } from "@tooee/toasts";
import { useState } from "react";
import type { ReactNode } from "react";

const step = function step(key: string): ParsedStep {
  return { ctrl: false, key, meta: false, option: false, shift: false };
};

const WhichKeyHarness = function WhichKeyHarness({
  children,
}: {
  children?: ReactNode;
}): ReactNode {
  const sequence = useCommandSequenceState();
  const hasOverlay = useHasOverlay();
  const hasModalOverlay = useHasModalOverlay();
  const [last, setLast] = useState("none");

  useCommandGroup({ id: "stream", prefix: "space s", title: "Stream" });
  useCommandGroup({ id: "go", prefix: "g", title: "Go" });
  useCommandGroup({ id: "leader", prefix: "space", title: "Leader actions" });

  useCommand({
    handler: () => {},
    hotkey: "space s t",
    id: "streams.today",
    modes: ["cursor"],
    title: "Today stream",
  });

  useCommand({
    handler: () => {},
    hotkey: "space s e",
    id: "streams.edit",
    modes: ["cursor"],
    title: "Edit stream",
  });

  useCommand({
    handler: () => {
      setLast("search");
    },
    hotkey: "g s",
    id: "go.search",
    modes: ["cursor"],
    title: "Go search",
  });

  useCommand({
    handler: () => {
      setLast("refresh");
    },
    hotkey: "r",
    id: "refresh",
    title: "Refresh dashboard",
  });

  useCommand({
    handler: () => {
      setLast("question");
    },
    hotkey: "g ?",
    id: "go.question",
    title: "Go question",
  });

  useCommand({
    handler: () => {},
    hidden: true,
    hotkey: "space h",
    id: "hidden.command",
    modes: ["cursor"],
    title: "Hidden command",
  });

  return (
    <AppLayout statusBar={{ items: [] }}>
      <box flexDirection="column">
        <text content={`pending:${sequence?.prefix.map((s) => s.key).join(" ") ?? "none"}`} />
        <text content={`overlay:${hasOverlay}`} />
        <text content={`modal:${hasModalOverlay}`} />
        <text content={`last:${last}`} />
        {children}
      </box>
    </AppLayout>
  );
};

const ActionMetadataHarness = function ActionMetadataHarness(): ReactNode {
  const sequence = useCommandSequenceState();
  const overlay = useCurrentOverlay();
  const hasOverlay = useHasOverlay();

  useActions([
    {
      category: "Artifact",
      group: "Artifact",
      handler: () => {},
      hidden: false,
      hotkey: "space a o",
      icon: "file",
      id: "actions.open",
      modes: ["cursor"],
      title: "Open artifact",
    },
    {
      group: "Artifact",
      handler: () => {},
      hotkey: "space a e",
      id: "actions.edit",
      modes: ["cursor"],
      title: "Edit artifact",
    },
  ]);

  return (
    <box flexDirection="column">
      <text content={`pending:${sequence?.prefix.map((s) => s.key).join(" ") ?? "none"}`} />
      <text
        content={`labels:${sequence?.candidates.map((c) => `${c.nextStep.key}:${c.group?.title ?? c.command.group ?? c.command.title}`).join(",") ?? "none"}`}
      />
      <text content={`overlay:${hasOverlay}`} />
      {overlay}
    </box>
  );
};

const ModalActions = function ModalActions(): ReactNode {
  const [escaped, setEscaped] = useState(false);
  useCommand({ handler: () => {}, hotkey: "m", id: "modal.action", title: "Modal action" });
  useCommand({
    handler: () => {
      setEscaped(true);
    },
    hotkey: "Escape",
    id: "modal.escape",
    title: "Modal escape",
  });

  return <text content={`escaped:${escaped}`} />;
};

const ManyActions = function ManyActions(): ReactNode {
  useActions(
    "abcdefghijklmnopqrstuvwxyz".split("").flatMap((key) =>
      [key, `ctrl+${key}`].map((hotkey) => ({
        handler: () => {},
        hotkey,
        id: `many.${hotkey}`,
        title: `Action for ${hotkey}`,
      }))
    )
  );

  return (
    <AppLayout statusBar={{ items: [] }}>
      <text content="App content" />
    </AppLayout>
  );
};

const setup = async function setup(children = <WhichKeyHarness />) {
  const s = await testRender(<TooeeProvider leader="space">{children}</TooeeProvider>, {
    height: 24,
    kittyKeyboard: true,
    width: 80,
  });

  await s.renderOnce();

  return s;
};

let testSetup: TestSession;

// Shift+/ with the alternate key code for the visible question mark.
const KITTY_QUESTION_MARK = "\u001B[47:63;2u";

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("which-key", () => {
  test("shows a passive overlay after a leader command sequence starts", async () => {
    testSetup = await setup();

    await press(testSetup, " ");
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("overlay:true");
    expect(frame).toContain("s → Stream");
    expect(frame).not.toContain("Hidden command");
  });

  test("shows the overlay for a plain prefix with a leader configured", async () => {
    testSetup = await setup();

    await press(testSetup, "g");
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("pending:g");
    expect(frame).toContain("which-key: g");
    expect(frame).toContain("s → Go search");
  });

  test("root hints let a single command run and dismiss the overlay", async () => {
    testSetup = await setup();

    await press(testSetup, "?");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("which-key: root");
    expect(frame).toContain("r → Refresh dashboard");
    expect(frame).toContain("g → Go");
    expect(frame).toContain("space → Leader actions");
    expect(frame).not.toContain("Hidden command");
    expect(frame).toContain("pending:none");
    expect(frame).toContain("modal:false");

    await press(testSetup, "r");
    expect(testSetup.captureCharFrame()).toContain("last:refresh");
    expect(testSetup.captureCharFrame()).not.toContain("which-key:");
  });

  test("root hints turn into continuations and a bound question mark completes the sequence", async () => {
    testSetup = await setup();

    await press(testSetup, KITTY_QUESTION_MARK);
    expect(testSetup.captureCharFrame()).toContain("which-key: root");
    await press(testSetup, "g");
    const prefix = testSetup.captureCharFrame();
    expect(prefix).not.toContain("which-key: root");
    expect(prefix).toContain("which-key: g");
    expect(prefix).toContain("? → Go question");

    await press(testSetup, KITTY_QUESTION_MARK);
    expect(testSetup.captureCharFrame()).toContain("last:question");
    expect(testSetup.captureCharFrame()).not.toContain("which-key:");
  });

  test("explicit leader-only mode keeps root hints and limits automatic hints", async () => {
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <CommandProvider leader="space">
          <ToastProvider>
            <OverlayProvider>
              <WhichKeyProvider leaderOnly>
                <WhichKeyHarness />
              </WhichKeyProvider>
            </OverlayProvider>
          </ToastProvider>
        </CommandProvider>
      </ThemeSwitcherProvider>,
      { height: 24, kittyKeyboard: true, width: 80 }
    );

    await press(testSetup, "?");
    expect(testSetup.captureCharFrame()).toContain("which-key: root");
    await pressEscape(testSetup);
    expect(testSetup.captureCharFrame()).not.toContain("which-key:");
    await press(testSetup, "g");
    expect(testSetup.captureCharFrame()).toContain("pending:g");
    expect(testSetup.captureCharFrame()).not.toContain("which-key:");
    await press(testSetup, "s");
    expect(testSetup.captureCharFrame()).toContain("last:search");
    await press(testSetup, " ");
    expect(testSetup.captureCharFrame()).toContain("which-key: space");
  });

  test("an application binding remapped to question mark takes precedence", async () => {
    testSetup = await testRender(
      <TooeeProvider config={{ keys: { refresh: "?" } }}>
        <WhichKeyHarness />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width: 80 }
    );

    await press(testSetup, KITTY_QUESTION_MARK);
    expect(testSetup.captureCharFrame()).toContain("last:refresh");
    expect(testSetup.captureCharFrame()).not.toContain("which-key:");
  });

  test("question mark reaches a focused editor even in cursor mode", async () => {
    testSetup = await setup(
      <WhichKeyHarness>
        <input focused width={20} />
      </WhichKeyHarness>
    );

    await press(testSetup, "?");
    expect(testSetup.renderer.currentFocusedEditor?.plainText).toBe("?");
    expect(testSetup.captureCharFrame()).not.toContain("which-key:");
  });

  test("root hints are scoped to the active modal and Escape dismisses only the hints", async () => {
    testSetup = await setup(
      <WhichKeyHarness>
        <CommandSurfaceProvider id="modal">
          <ModalActions />
        </CommandSurfaceProvider>
      </WhichKeyHarness>
    );

    await press(testSetup, "?");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("m → Modal action");
    expect(frame).not.toContain("Refresh dashboard");

    await pressEscape(testSetup);
    expect(testSetup.captureCharFrame()).not.toContain("which-key:");
    expect(testSetup.captureCharFrame()).toContain("escaped:false");
    await pressEscape(testSetup);
    expect(testSetup.captureCharFrame()).toContain("escaped:true");
  });

  test("large root lists fit the terminal and show an overflow count", async () => {
    testSetup = await setup(<ManyActions />);

    await press(testSetup, "?");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("App content");
    expect(frame).toContain("which-key: root");
    expect(frame).toContain("a → Action for a");
    expect(frame).toMatch(/… \d+ more keys/u);
  });

  test("updates and clears sequence state as a command completes", async () => {
    testSetup = await setup();

    await press(testSetup, " ");
    await testSetup.renderOnce();
    await press(testSetup, "s");
    await testSetup.renderOnce();

    const nestedFrame = testSetup.captureCharFrame();
    expect(nestedFrame).toContain("overlay:true");
    expect(nestedFrame).toContain("t → Today stream");
    expect(nestedFrame).toContain("e → Edit stream");

    await press(testSetup, "t");
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("pending:none");
    expect(frame).toContain("overlay:false");
    expect(frame).not.toContain("which-key:");
  });

  test("useActions preserves command display metadata for fallback group labels", async () => {
    testSetup = await setup(<ActionMetadataHarness />);

    await press(testSetup, " ");
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("a → Artifact");
  });

  test("renders named grouped next-key entries", async () => {
    const space = step("space");
    const s = step("s");
    const t = step("t");
    const e = step("e");

    const state: CommandSequenceState = {
      candidates: [
        {
          command: {
            handler: () => {},
            id: "streams.today",
            title: "Today stream",
          },
          group: { id: "stream", prefix: "space s", title: "Stream" },
          hotkey: "space s t",
          nextStep: s,
          remainingSteps: [s, t],
          steps: [space, s, t],
        },
        {
          command: {
            handler: () => {},
            id: "streams.edit",
            title: "Edit stream",
          },
          group: { id: "stream", prefix: "space s", title: "Stream" },
          hotkey: "space s e",
          nextStep: s,
          remainingSteps: [s, e],
          steps: [space, s, e],
        },
      ],
      prefix: [space],
    };

    testSetup = await testRender(
      <TooeeProvider leader="space">
        <WhichKeyOverlay state={state} />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width: 80 }
    );
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("which-key: space");
    expect(frame).toContain("s → Stream");
  });
});

describe("which-key with remapped keys", () => {
  test("lists a command under its remapped key", async () => {
    testSetup = await testRender(
      <TooeeProvider config={{ keys: { "go.search": "g x" } }}>
        <WhichKeyHarness />
      </TooeeProvider>,
      { height: 24, kittyKeyboard: true, width: 80 }
    );
    await testSetup.renderOnce();

    await press(testSetup, "g");

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("x → Go search");
    expect(frame).not.toContain("s → Go search");
  });
});
