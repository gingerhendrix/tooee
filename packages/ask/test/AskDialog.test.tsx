import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { useRef, useState } from "react";
import { TooeeProvider } from "@tooee/shell";
import { useCommand } from "@tooee/commands";
import { useCurrentOverlay, useOverlay, useOverlayState } from "@tooee/overlays";
import type { OverlayController } from "@tooee/overlays";
import { testRender } from "../../../test/support/test-render.ts";
import { useAskDialog } from "../src/use-ask-dialog.js";
import type { AskDialogHandle } from "../src/use-ask-dialog.js";

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

async function press(key: string, modifiers?: { ctrl?: boolean; shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressKey(key, modifiers);
  });
  await testSetup.renderOnce();
}

async function pressEscape() {
  await act(async () => {
    testSetup.mockInput.pressEscape();
  });
  await testSetup.renderOnce();
}

async function pressEnter() {
  await act(async () => {
    testSetup.mockInput.pressEnter();
  });
  await testSetup.renderOnce();
}

async function typeText(text: string) {
  await act(async () => {
    await testSetup.mockInput.typeText(text);
  });
  await testSetup.renderOnce();
}

interface HarnessHandles {
  dialog: AskDialogHandle;
  ownerDialog: AskDialogHandle | null;
  overlay: OverlayController;
  stackIds: () => readonly string[];
  unmountOwner: () => void;
}

const handles: { current: HarnessHandles | null } = { current: null };
let hostProbeCount = 0;
let settlements: Array<string | null> = [];

beforeEach(() => {
  handles.current = null;
  hostProbeCount = 0;
  settlements = [];
});

function record(label: string) {
  return (value: string | null) => {
    settlements.push(value === null ? null : `${label}:${value}`);
  };
}

/** Child that owns its own dialog hook, so owner unmount can be exercised. */
function DialogOwner({ openRef }: { openRef: { current: AskDialogHandle | null } }) {
  const dialog = useAskDialog();
  openRef.current = dialog;
  return null;
}

function Harness() {
  const overlay = useOverlay();
  const overlayState = useOverlayState();
  const current = useCurrentOverlay();
  const dialog = useAskDialog();
  const [ownerMounted, setOwnerMounted] = useState(true);
  const ownerDialogRef = useRef<AskDialogHandle | null>(null);
  const stateRef = useRef(overlayState);
  stateRef.current = overlayState;

  useCommand({
    handler: () => {
      hostProbeCount++;
    },
    hotkey: "z",
    id: "host-probe",
    modes: ["cursor"],
    title: "Host probe",
  });

  handles.current = {
    dialog,
    overlay,
    get ownerDialog() {
      return ownerDialogRef.current;
    },
    stackIds: () => stateRef.current.stack,
    unmountOwner: () => setOwnerMounted(false),
  };

  return (
    <box flexDirection="column">
      <text content={`stack:${overlayState.stack.length}`} />
      {ownerMounted && <DialogOwner openRef={ownerDialogRef} />}
      {current}
    </box>
  );
}

async function setup() {
  const session = await testRender(
    <TooeeProvider>
      <Harness />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 80 },
  );
  await session.renderOnce();
  return session;
}

async function openDialog(
  open: (options: { prompt: string }) => Promise<string | null>,
  prompt: string,
  label: string,
) {
  await act(async () => {
    void open({ prompt }).then(record(label));
  });
  await testSetup.renderOnce();
}

describe("useAskDialog settlement", () => {
  test("submit resolves the typed value, closes the overlay, and settles once", async () => {
    testSetup = await setup();
    await openDialog((o) => handles.current!.dialog.open(o), "Question?", "ask");
    expect(testSetup.captureCharFrame()).toContain("Question?");

    await typeText("hello");
    await pressEnter();

    expect(settlements).toEqual(["ask:hello"]);
    expect(testSetup.captureCharFrame()).toContain("stack:0");
    expect(testSetup.captureCharFrame()).not.toContain("Question?");
  });

  test("cancel via q in cursor mode resolves null exactly once", async () => {
    testSetup = await setup();
    await openDialog((o) => handles.current!.dialog.open(o), "Question?", "ask");

    await pressEscape(); // dialog surface: insert -> cursor
    await press("q"); // ask cancel

    expect(settlements).toEqual([null]);
    expect(testSetup.captureCharFrame()).toContain("stack:0");
  });

  test("host commands are suspended while the dialog is open and resume after", async () => {
    testSetup = await setup();
    await openDialog((o) => handles.current!.dialog.open(o), "Question?", "ask");

    await pressEscape(); // dialog cursor mode; 'z' would now be dispatchable if not suspended
    await press("z");
    expect(hostProbeCount).toBe(0);

    await press("q"); // cancel the dialog
    await press("z"); // host command resumes
    expect(hostProbeCount).toBe(1);
    expect(settlements).toEqual([null]);
  });

  test("same-id replacement settles the displaced dialog null exactly once", async () => {
    testSetup = await setup();
    await openDialog((o) => handles.current!.dialog.open(o), "Question?", "ask");

    const topId = handles.current!.stackIds().at(-1)!;
    await act(async () => {
      handles.current!.overlay.open(topId, () => <text content="REPLACEMENT" />, undefined, {
        ownCommands: true,
        role: "modal",
      });
    });
    await testSetup.renderOnce();

    expect(settlements).toEqual([null]);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("REPLACEMENT");
    expect(frame).toContain("stack:1"); // the replacement record remains

    // Closing the replacement must not settle the dialog again.
    await act(async () => {
      handles.current!.overlay.hide(topId);
    });
    await testSetup.renderOnce();
    expect(settlements).toEqual([null]);
  });

  test("unmounting the owning component settles null and removes the overlay record", async () => {
    testSetup = await setup();
    await openDialog((o) => handles.current!.ownerDialog!.open(o), "Owned?", "owned");
    expect(testSetup.captureCharFrame()).toContain("Owned?");

    const ownerDialog = handles.current!.ownerDialog!;
    await act(async () => {
      handles.current!.unmountOwner();
    });
    await testSetup.renderOnce();

    expect(settlements).toEqual([null]);
    expect(testSetup.captureCharFrame()).toContain("stack:0");

    // Opening on an unmounted owner resolves null without opening an overlay.
    await act(async () => {
      void ownerDialog.open({ prompt: "Too late?" }).then(record("late"));
    });
    await testSetup.renderOnce();
    expect(settlements).toEqual([null, null]);
    expect(testSetup.captureCharFrame()).toContain("stack:0");
  });

  test("concurrent dialogs get unique overlay ids and settle independently", async () => {
    testSetup = await setup();
    await act(async () => {
      void handles.current!.dialog.open({ prompt: "First?" }).then(record("first"));
      void handles.current!.dialog.open({ prompt: "Second?" }).then(record("second"));
    });
    await testSetup.renderOnce();

    const ids = handles.current!.stackIds();
    expect(ids.length).toBe(2);
    expect(new Set(ids).size).toBe(2); // no fixed/global id collision
    expect(settlements).toEqual([]); // First was NOT displaced by Second

    await typeText("two");
    await pressEnter(); // topmost (Second) owns input and submits
    expect(settlements).toEqual(["second:two"]);

    await typeText("one");
    await pressEnter(); // First resumes as topmost and submits
    expect(settlements).toEqual(["second:two", "first:one"]);
    expect(testSetup.captureCharFrame()).toContain("stack:0");
  });

  test("double submit cannot settle twice", async () => {
    testSetup = await setup();

    let submitFromCommand: (() => void) | null = null;
    await act(async () => {
      void handles
        .current!.dialog.open({
          commands: [
            {
              handler: () => {},
              hidden: true,
              id: "grab-submit",
              title: "Grab submit",
            },
          ],
          controllerRef: (controller) => {
            if (controller) {
              submitFromCommand = () => controller.submit();
            }
          },
          prompt: "Once?",
        })
        .then(record("once"));
    });
    await testSetup.renderOnce();

    await typeText("v");
    await act(async () => {
      submitFromCommand?.();
      submitFromCommand?.(); // second synchronous submit must be a no-op
    });
    await testSetup.renderOnce();

    expect(settlements).toEqual(["once:v"]);
    expect(testSetup.captureCharFrame()).toContain("stack:0");
  });
});
