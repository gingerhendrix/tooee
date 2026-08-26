import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, useRef, useState } from "react";
import { TooeeProvider } from "@tooee/shell";
import { CommandSurfaceProvider, useCommand, useMode } from "@tooee/commands";
import { AppLayout } from "@tooee/layout";
import { testRender } from "../../../test/support/test-render.ts";
import { copied } from "../../../test/support/clipboard-mock.ts";
import { expectDefined } from "./support/expect-defined.ts";
import { AskEditor } from "../src/ask-editor.js";
import { AskOverlay } from "../src/ask-overlay.js";
import { buildAskHints } from "../src/ask-panel.js";
import { useAskEditor } from "../src/use-ask-editor.js";
import type { AskEditorCommandGroup, AskEditorController } from "../src/use-ask-editor.js";

const ControllerHost = function ControllerHost(props: {
  multiline?: boolean;
  defaultValue?: string;
  onSubmit?: (value: string) => void;
  controllerRef: React.RefObject<AskEditorController | null>;
}): React.ReactNode {
  return (
    <AskOverlay
      prompt="Question"
      multiline={props.multiline}
      defaultValue={props.defaultValue}
      onSubmit={props.onSubmit ?? (() => {})}
      onCancel={() => {}}
      controllerRef={props.controllerRef}
    />
  );
};

const CopyHost = function CopyHost(props: {
  defaultValue?: string;
  disable?: AskEditorCommandGroup[];
  multiline?: boolean;
}): React.ReactNode {
  const { editor } = useAskEditor({
    commandScope: "copy-test",
    defaultValue: props.defaultValue,
    disable: props.disable,
    multiline: props.multiline,
  });
  const mode = useMode();
  return (
    <AppLayout
      scrollProps={{ focused: false }}
      statusBar={{ items: [{ label: "mode:", value: mode }] }}
    >
      <AskEditor editor={editor} />
    </AppLayout>
  );
};

const PickerSurface = function PickerSurface({
  onClose,
}: {
  onClose: () => void;
}): React.ReactNode {
  useCommand({
    handler: onClose,
    hotkey: "x",
    id: "picker:close",
    modes: ["cursor"],
    title: "Close picker",
  });
  return (
    <box position="absolute" left="30%" right="30%" top="40%" bottom="40%" border>
      <text content="PICKER" />
    </box>
  );
};

const Host = function Host(props: {
  onCancel: () => void;
  onSubmit: (value: string) => void;
}): React.ReactNode {
  const [pickerOpen, setPickerOpen] = useState(true);
  const controllerRef = useRef<AskEditorController>(null);
  return (
    <AskOverlay
      prompt="Question"
      defaultValue="hello"
      onSubmit={props.onSubmit}
      onCancel={props.onCancel}
      controllerRef={controllerRef}
      commands={[
        {
          handler: () => {
            setPickerOpen(true);
          },
          hotkey: "m",
          id: "host:open-picker",
          modes: ["cursor"],
          title: "Open picker",
        },
      ]}
    >
      {pickerOpen && (
        <CommandSurfaceProvider id="host:picker" role="modal" initialMode="cursor">
          <PickerSurface
            onClose={() => {
              setPickerOpen(false);
            }}
          />
        </CommandSurfaceProvider>
      )}
    </AskOverlay>
  );
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

beforeEach(() => {
  copied.length = 0;
});

afterEach(() => {
  testSetup?.renderer.destroy();
});

const setup = async function setup(node: React.ReactNode) {
  const s = await testRender(<TooeeProvider initialMode="insert">{node}</TooeeProvider>, {
    height: 24,
    kittyKeyboard: true,
    width: 80,
  });
  await s.renderOnce();
  return s;
};

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

const pressShiftEnter = async function pressShiftEnter() {
  await act(async () => {
    testSetup.mockInput.pressEnter({ shift: true });
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

interface EditableTestTarget {
  cursorOffset: number;
  insertText: (text: string) => void;
  plainText: string;
  setSelection: (start: number, end: number) => void;
}

const hasChildren = function hasChildren(node: object): node is { getChildren: () => unknown[] } {
  return "getChildren" in node && typeof node.getChildren === "function";
};

const findEditable = function findEditable(node: unknown): EditableTestTarget | undefined {
  if (node === null || node === undefined || typeof node !== "object") {
    return undefined;
  }
  if (
    "plainText" in node &&
    typeof node.plainText === "string" &&
    "cursorOffset" in node &&
    typeof node.cursorOffset === "number" &&
    "insertText" in node &&
    typeof node.insertText === "function" &&
    "setSelection" in node &&
    typeof node.setSelection === "function"
  ) {
    return node;
  }
  if (hasChildren(node)) {
    for (const child of node.getChildren()) {
      const editable = findEditable(child);
      if (editable) {
        return editable;
      }
    }
  }
  return undefined;
};

describe("AskEditor clipboard commands", () => {
  test("yy copies the single-line buffer in cursor mode", async () => {
    testSetup = await setup(<CopyHost defaultValue="single line" />);
    await pressEscape();
    await press("y");
    expect(copied).toEqual([]);
    await press("y");

    expect(copied).toEqual(["single line"]);
    expect(testSetup.renderer.getCursorState().style).toBe("block");
  });

  test("yy copies only the current multiline line", async () => {
    testSetup = await setup(<CopyHost multiline defaultValue={"first\nsecond\nthird"} />);
    await pressEscape();
    act(() => {
      expectDefined(findEditable(testSetup.renderer.root)).cursorOffset = 8;
    });
    await press("y");
    await press("y");

    expect(copied).toEqual(["second"]);
  });

  test("yg copies the whole multiline document", async () => {
    testSetup = await setup(<CopyHost multiline defaultValue={"first\nsecond"} />);
    await pressEscape();
    await press("y");
    await press("g");

    expect(copied).toEqual(["first\nsecond"]);
  });

  test("yv copies the active editor selection", async () => {
    testSetup = await setup(<CopyHost multiline defaultValue="one two three" />);
    await pressEscape();
    act(() => {
      expectDefined(findEditable(testSetup.renderer.root)).setSelection(4, 7);
    });
    await press("y");
    await press("v");

    expect(copied).toEqual(["two"]);
  });

  test("copy sequences stay inactive in insert mode", async () => {
    testSetup = await setup(<CopyHost defaultValue="start" />);
    await typeText("yy");

    expect(copied).toEqual([]);
    expect(expectDefined(findEditable(testSetup.renderer.root)).plainText).toBe("startyy");
  });

  test("empty copy targets warn without touching the clipboard", async () => {
    testSetup = await setup(<CopyHost multiline />);
    await pressEscape();
    await press("y");
    await press("y");
    expect(testSetup.captureCharFrame()).toContain("Nothing to copy");
    await press("y");
    await press("g");
    expect(testSetup.captureCharFrame()).toContain("Nothing to copy");
    await press("y");
    await press("v");

    expect(copied).toEqual([]);
    expect(testSetup.captureCharFrame()).toContain("Nothing selected");
  });

  test("a failed y chord falls through to the conflicting insert command without copying", async () => {
    testSetup = await setup(<CopyHost defaultValue="text" />);
    await pressEscape();
    await press("y");
    await press("i");

    expect(testSetup.renderer.getCursorState().style).toBe("line");
    expect(copied).toEqual([]);
  });

  test("the copy command group can be disabled for consumer overrides", async () => {
    testSetup = await setup(<CopyHost defaultValue="text" disable={["copy"]} />);
    await pressEscape();
    await press("y");
    await press("y");

    expect(copied).toEqual([]);
  });
});

describe("AskEditorController", () => {
  test("setText replaces the single-line value through React state", async () => {
    const controllerRef = { current: null as AskEditorController | null };
    let submitted = "";
    testSetup = await setup(
      <ControllerHost
        defaultValue="hello"
        controllerRef={controllerRef}
        onSubmit={(value) => {
          submitted = value;
        }}
      />,
    );

    expect(controllerRef.current).not.toBeNull();
    await act(async () => {
      expectDefined(controllerRef.current).setText("replaced");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(expectDefined(controllerRef.current).getText()).toBe("replaced");

    // Cursor moved to the end: further typing appends.
    await typeText("!");
    await pressEnter();

    expect(submitted).toBe("replaced!");
  });

  test("setText replaces the multiline buffer and moves the cursor to the end", async () => {
    const controllerRef = { current: null as AskEditorController | null };
    let submitted = "";
    testSetup = await setup(
      <ControllerHost
        multiline
        defaultValue="old"
        controllerRef={controllerRef}
        onSubmit={(value) => {
          submitted = value;
        }}
      />,
    );

    await act(async () => {
      expectDefined(controllerRef.current).setText("one\ntwo");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(expectDefined(controllerRef.current).getText()).toBe("one\ntwo");

    await typeText("!");
    await pressShiftEnter();

    expect(submitted).toBe("one\ntwo!");
  });

  test("insertText inserts at the cursor and submit() submits programmatically", async () => {
    const controllerRef = { current: null as AskEditorController | null };
    let submitted = "";
    testSetup = await setup(
      <ControllerHost
        multiline
        defaultValue="ab"
        controllerRef={controllerRef}
        onSubmit={(value) => {
          submitted = value;
        }}
      />,
    );

    await act(async () => {
      expectDefined(controllerRef.current).insertText("XY");
      expectDefined(controllerRef.current).submit();
      await Promise.resolve();
    });

    expect(submitted).toBe("abXY");
  });

  test("insertText into the single-line input is readable and submittable synchronously", async () => {
    const controllerRef = { current: null as AskEditorController | null };
    let submitted = "";
    testSetup = await setup(
      <ControllerHost
        defaultValue="ab"
        controllerRef={controllerRef}
        onSubmit={(value) => {
          submitted = value;
        }}
      />,
    );

    await act(async () => {
      expectDefined(controllerRef.current).insertText("XY");
      // The inserted text must be visible to getText()/submit() before the
      // next render, exactly like the multiline path.
      expect(expectDefined(controllerRef.current).getText()).toBe("abXY");
      expectDefined(controllerRef.current).submit();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(submitted).toBe("abXY");

    // Controlled React state stays synchronized: further typing appends.
    await typeText("!");
    await pressEnter();

    expect(submitted).toBe("abXY!");
  });

  test("mode reads live and setMode switches the local mode", async () => {
    const controllerRef = { current: null as AskEditorController | null };
    testSetup = await setup(<ControllerHost defaultValue="hi" controllerRef={controllerRef} />);

    expect(expectDefined(controllerRef.current).mode).toBe("insert");

    await act(async () => {
      expectDefined(controllerRef.current).setMode("cursor");
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(expectDefined(controllerRef.current).mode).toBe("cursor");
    expect(testSetup.renderer.getCursorState().style).toBe("block");
  });
});

describe("AskOverlay chrome extension points", () => {
  test("custom hints extend the defaults and statusRight renders", async () => {
    testSetup = await setup(
      <AskOverlay
        prompt="Question"
        onSubmit={() => {}}
        onCancel={() => {}}
        hints={({ defaults }) => [...defaults, "m model"].join("  ")}
        statusRight="REC"
      />,
    );

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Enter submit  Esc commands  m model");
    expect(frame).toContain("REC");
  });

  test("title moves the prompt onto its own line", async () => {
    testSetup = await setup(
      <AskOverlay
        title="Dispatch"
        prompt="Enter a message"
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Dispatch");
    expect(frame).toContain("Enter a message");
  });

  test("buildAskHints matches the shipped hint strings", () => {
    expect(buildAskHints("insert", { multiline: true }).join("  ")).toBe(
      "Shift+Enter submit  Esc commands",
    );
    expect(buildAskHints("cursor", {}).join("  ")).toBe("i insert  q quit  Enter submit");
    expect(buildAskHints("cursor", { multiline: true }).join("  ")).toBe(
      "i insert  q quit  Enter submit",
    );
    expect(buildAskHints("cursor", { extra: ["m model"] }).join("  ")).toBe(
      "i insert  q quit  Enter submit  m model",
    );
  });
});

describe("AskOverlay nested modal surfaces", () => {
  test("a modal child surface suspends ask commands and editor focus without guards", async () => {
    let cancelCount = 0;
    testSetup = await setup(
      <Host
        onCancel={() => {
          cancelCount += 1;
        }}
        onSubmit={() => {}}
      />,
    );

    expect(testSetup.captureCharFrame()).toContain("PICKER");
    // The picker surface owns input: the editor blurs (no visible cursor)...
    expect(testSetup.renderer.getCursorState().visible).toBe(false);

    // ...and ask commands are suspended: q does not cancel, typing does not insert.
    await press("q");
    expect(cancelCount).toBe(0);

    // The picker's own command works and closes it.
    await press("x");
    expect(testSetup.captureCharFrame()).not.toContain("PICKER");

    // Focus and commands return to the ask surface.
    expect(testSetup.renderer.getCursorState().visible).toBe(true);
    await pressEscape();
    await press("q");
    expect(cancelCount).toBe(1);
  });

  test("consumer commands registered via the commands prop reopen the picker", async () => {
    testSetup = await setup(<Host onCancel={() => {}} onSubmit={() => {}} />);

    await press("x");
    expect(testSetup.captureCharFrame()).not.toContain("PICKER");

    await pressEscape();
    await press("m");
    expect(testSetup.captureCharFrame()).toContain("PICKER");
  });
});
