import { testRender } from "../../../test/support/test-render.ts";
import { afterEach, describe, expect, test } from "bun:test";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { CommandSurfaceProvider, useCommand, useCommandStore } from "@tooee/commands";
import { useCurrentOverlay } from "@tooee/overlays";
import { TooeeProvider } from "@tooee/shell";
import { press } from "./support/test-helpers.ts";
import type { TestSession } from "./support/test-helpers.ts";

// A stand-in for @tooee/panels' Panel: a "panel"-role command surface plus a
// helper that publishes it as the group's active panel. Keeps this shell test
// free of a @tooee/panels dependency while exercising the same store state.
const Activate = function Activate({
  groupId,
  panelId,
}: {
  groupId: string;
  panelId: string;
}): ReactNode {
  const store = useCommandStore();
  useEffect(() => {
    store.activatePanel(groupId, panelId);
  }, [store, groupId, panelId]);
  return null;
};

const PanelACommands = function PanelACommands(): ReactNode {
  useCommand({
    handler: () => {},
    hotkey: "j",
    id: "a.list",
    modes: ["cursor"],
    title: "Panel A List",
  });
  return null;
};

const PanelBCommands = function PanelBCommands(): ReactNode {
  useCommand({
    handler: () => {},
    hotkey: "l",
    id: "b.only",
    modes: ["cursor"],
    title: "Panel B Only",
  });
  return null;
};

const PanelHarness = function PanelHarness(): ReactNode {
  const current = useCurrentOverlay();
  useCommand({
    handler: () => {},
    hotkey: "g",
    id: "root.global",
    modes: ["cursor"],
    title: "Root Global",
  });
  return (
    <box flexDirection="column">
      <CommandSurfaceProvider id="a" role="panel" groupId="g">
        <PanelACommands />
        <Activate groupId="g" panelId="a" />
      </CommandSurfaceProvider>
      <CommandSurfaceProvider id="b" role="panel" groupId="g">
        <PanelBCommands />
      </CommandSurfaceProvider>
      {current}
    </box>
  );
};

const InsertPanelCommands = function InsertPanelCommands(): ReactNode {
  const store = useCommandStore();
  useCommand({
    handler: () => {
      store.registryFor(store.rootRecord).invoke("command-palette");
    },
    hotkey: "o",
    id: "panel.open-palette",
    modes: ["insert"],
    title: "Open panel palette",
  });
  useCommand({
    handler: () => {},
    id: "panel.insert-only",
    modes: ["insert"],
    title: "Panel Insert Only",
  });
  return null;
};

const InsertPanelHarness = function InsertPanelHarness(): ReactNode {
  const current = useCurrentOverlay();
  useCommand({
    handler: () => {},
    id: "root.insert-only",
    modes: ["insert"],
    title: "Root Insert Only",
  });
  useCommand({
    handler: () => {},
    id: "root.cursor-only",
    modes: ["cursor"],
    title: "Root Cursor Only",
  });
  return (
    <box flexDirection="column">
      <CommandSurfaceProvider id="editor" role="panel" groupId="g" initialMode="insert">
        <InsertPanelCommands />
        <Activate groupId="g" panelId="editor" />
      </CommandSurfaceProvider>
      {current}
    </box>
  );
};

const typeFilter = async function typeFilter(session: TestSession, text: string): Promise<void> {
  for (const char of text) {
    // oxlint-disable-next-line no-await-in-loop -- each key must render before the next
    await press(session, char);
  }
};

const setup = async function setup(): Promise<TestSession> {
  const session = await testRender(
    <TooeeProvider>
      <PanelHarness />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await session.renderOnce();
  return session;
};

const setupInsertPanel = async function setupInsertPanel(): Promise<TestSession> {
  const session = await testRender(
    <TooeeProvider>
      <InsertPanelHarness />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await session.renderOnce();
  return session;
};

let testSetup: TestSession | undefined;

afterEach(() => {
  testSetup?.renderer.destroy();
  testSetup = undefined;
});

describe("command palette under panels", () => {
  test("the palette (opened via fall-through) lists the active panel's commands", async () => {
    testSetup = await setup();
    // ":" is unbound on the active panel, so it falls through to the root palette.
    await press(testSetup, ":");
    await typeFilter(testSetup, "Panel A List");
    expect(testSetup.captureCharFrame()).toContain("Panel A List");
  });

  test("root commands remain reachable in the palette while a panel is active", async () => {
    testSetup = await setup();
    await press(testSetup, ":");
    await typeFilter(testSetup, "Root Global");
    expect(testSetup.captureCharFrame()).toContain("Root Global");
  });

  test("inactive panel commands are absent from the palette", async () => {
    testSetup = await setup();
    await press(testSetup, ":");
    await typeFilter(testSetup, "Panel B Only");
    expect(testSetup.captureCharFrame()).not.toContain("Panel B Only");
  });

  test("a programmatically opened insert-panel palette excludes root commands", async () => {
    testSetup = await setupInsertPanel();
    await press(testSetup, "o");

    let frame = testSetup.captureCharFrame();
    // Exactly the two panel-local commands are available (the opener plus the
    // insert-only command); neither root-mode variant enters the list.
    expect(frame).toMatch(/Filter.commands.*2/u);
    expect(frame).not.toContain("Root Insert Only");
    expect(frame).not.toContain("Root Cursor Only");

    await typeFilter(testSetup, "Panel Insert Only");
    frame = testSetup.captureCharFrame();
    expect(frame).toContain("Panel Insert Only");
  });
});
