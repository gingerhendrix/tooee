import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { useRef } from "react";
import { TooeeProvider } from "@tooee/shell";
import { useCurrentOverlay } from "@tooee/overlays";
import { useChooseDialog } from "@tooee/choose";
import { testRender } from "../../../test/support/test-render.ts";
import { expectDefined } from "./support/expect-defined.ts";
import { useAskDialog } from "../src/use-ask-dialog.js";
import type { AskEditorController } from "../src/use-ask-editor.js";

interface Model {
  id: string;
  label: string;
}

const MODELS: Model[] = [
  { id: "small", label: "Small model" },
  { id: "medium", label: "Medium model" },
  { id: "large", label: "Large model" },
];

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const press = async function press(key: string, modifiers?: { ctrl?: boolean; shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressKey(key, modifiers);
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const pressEscape = async function pressEscape() {
  await act(async () => {
    testSetup.mockInput.pressEscape();
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const pressEnter = async function pressEnter() {
  await act(async () => {
    testSetup.mockInput.pressEnter();
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const typeText = async function typeText(text: string) {
  await act(async () => {
    await testSetup.mockInput.typeText(text);
  });
  await testSetup.renderOnce();
};

let askSettlements: Array<string | null> = [];
let chooseSettlements: Array<string | null> = [];
const nested: { current: NestedHarnessHandles | null } = { current: null };

beforeEach(() => {
  nested.current = null;
  askSettlements = [];
  chooseSettlements = [];
});

interface NestedHarnessHandles {
  open: () => Promise<string | null>;
}

/**
 * PTUI AskWithModel shape: an ask dialog whose surface command opens a nested
 * typed chooser, then inserts the chosen model into the parent editor.
 */
const NestedHarness = function NestedHarness(): React.ReactNode {
  const current = useCurrentOverlay();
  const ask = useAskDialog();
  const choose = useChooseDialog<Model>();
  const controllerRef = useRef<AskEditorController | null>(null);

  nested.current = {
    open: async () =>
      await ask.open({
        commands: [
          {
            handler: () => {
              void choose
                .open({
                  items: MODELS,
                  prompt: "Pick a model",
                  toItem: (model) => ({ description: model.id, text: model.label }),
                })
                .then((model) => {
                  chooseSettlements.push(model === null ? null : model.id);
                  if (model !== null) {
                    controllerRef.current?.insertText(model.id);
                  }
                });
            },
            hotkey: "ctrl+p",
            id: "pick-model",
            modes: ["insert", "cursor"],
            title: "Pick model",
          },
        ],
        controllerRef,
        multiline: false,
        prompt: "Ask something",
      }),
  };

  return (
    <box flexDirection="column">
      <text content="HOST" />
      {current}
    </box>
  );
};

const setupNested = async function setupNested() {
  const session = await testRender(
    <TooeeProvider>
      <NestedHarness />
    </TooeeProvider>,
    { height: 30, kittyKeyboard: true, width: 80 },
  );
  await session.renderOnce();
  return session;
};

const openNestedAsk = async function openNestedAsk() {
  await act(async () => {
    void expectDefined(nested.current)
      .open()
      .then((value) => askSettlements.push(value));
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

describe("nested Choose dialog over Ask dialog", () => {
  test("nested pick suspends the ask editor, inserts, and restores focus/value", async () => {
    testSetup = await setupNested();
    await openNestedAsk();
    expect(testSetup.captureCharFrame()).toContain("Ask something");

    await typeText("use ");
    await press("p", { ctrl: true });
    expect(testSetup.captureCharFrame()).toContain("Pick a model");

    // The ask editor is suspended: this text goes to the chooser filter.
    await typeText("med");
    await pressEnter();

    expect(chooseSettlements).toEqual(["medium"]);
    expect(askSettlements).toEqual([]);
    expect(testSetup.captureCharFrame()).not.toContain("Pick a model");

    // Focus and editor value restored: further typing appends to the editor.
    await typeText("!");
    await pressEnter();

    expect(askSettlements).toEqual(["use medium!"]);
  });

  test("cancelling the nested chooser restores the parent surface mode", async () => {
    testSetup = await setupNested();
    await openNestedAsk();

    await pressEscape();
    expect(testSetup.captureCharFrame()).toContain("i insert");

    await press("p", { ctrl: true });
    expect(testSetup.captureCharFrame()).toContain("Pick a model");

    await pressEscape();
    await pressEscape();

    expect(chooseSettlements).toEqual([null]);
    expect(askSettlements).toEqual([]);

    // Parent surface's local mode survived the nested dialog: still cursor.
    expect(testSetup.captureCharFrame()).toContain("i insert");

    // And the parent editor still works: q cancels from cursor mode.
    await press("q");
    expect(askSettlements).toEqual([null]);
  });

  test("parent ask commands are suspended while the chooser is topmost", async () => {
    testSetup = await setupNested();
    await openNestedAsk();

    await typeText("kept");
    await press("p", { ctrl: true });
    expect(testSetup.captureCharFrame()).toContain("Pick a model");

    // ctrl+p on the chooser surface is its own "move up" — it must not
    // re-trigger the ask surface's pick-model command (no second chooser).
    await press("p", { ctrl: true });
    const frames = testSetup.captureCharFrame();
    const occurrences = frames.split("Pick a model").length - 1;
    expect(occurrences).toBe(1);

    await pressEscape();
    await pressEscape();
    expect(chooseSettlements).toEqual([null]);

    // Editor value preserved through the whole nested lifecycle.
    await pressEnter();
    expect(askSettlements).toEqual(["kept"]);
  });
});
