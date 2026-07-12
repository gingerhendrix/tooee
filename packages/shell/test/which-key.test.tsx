import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { TooeeProvider, WhichKeyOverlay } from "@tooee/shell";
import { useActions, useCommand, useCommandGroup, useCommandSequenceState } from "@tooee/commands";
import type { CommandSequenceState, ParsedStep } from "@tooee/commands";
import { useCurrentOverlay, useHasOverlay } from "@tooee/overlays";
import { press } from "./support/test-helpers.ts";
import type { TestSession } from "./support/test-helpers.ts";

function WhichKeyHarness() {
  const sequence = useCommandSequenceState();
  const overlay = useCurrentOverlay();
  const hasOverlay = useHasOverlay();

  useCommandGroup({ id: "stream", prefix: "space s", title: "Stream" });

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
    handler: () => {},
    hotkey: "g s",
    id: "go.search",
    modes: ["cursor"],
    title: "Go search",
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
    <box flexDirection="column">
      <text content={`pending:${sequence?.prefix.map((s) => s.key).join(" ") ?? "none"}`} />
      <text
        content={`labels:${sequence?.candidates.map((c) => `${c.nextStep.key}:${c.group?.title ?? c.command.group ?? c.command.title}`).join(",") ?? "none"}`}
      />
      <text content={`overlay:${hasOverlay}`} />
      {overlay}
    </box>
  );
}

function ActionMetadataHarness() {
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
}

async function setup(children = <WhichKeyHarness />) {
  const s = await testRender(<TooeeProvider leader="space">{children}</TooeeProvider>, {
    height: 24,
    kittyKeyboard: true,
    width: 80,
  });
  await s.renderOnce();
  return s;
}

let testSetup: TestSession;

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

  test("does not show the overlay for non-leader command sequences by default", async () => {
    testSetup = await setup();

    await press(testSetup, "g");
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("pending:g");
    expect(frame).toContain("overlay:false");
    expect(frame).not.toContain("which-key:");
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
      { height: 24, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("which-key: space");
    expect(frame).toContain("s → Stream");
  });
});

function step(key: string): ParsedStep {
  return { ctrl: false, key, meta: false, option: false, shift: false };
}
