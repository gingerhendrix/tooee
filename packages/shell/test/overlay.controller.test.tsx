import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { useRef } from "react";
import { TooeeProvider } from "@tooee/shell";
import { useOverlay, useCurrentOverlay, useHasOverlay } from "@tooee/overlays";
import type { OverlayCloseReason, OverlayHandle, OverlayOpenOptions } from "@tooee/overlays";
import { AppLayout } from "@tooee/layout";
import { useCommand, useMode } from "@tooee/commands";
import { press, pressEscape } from "./support/test-helpers.ts";
import type { TestSession } from "./support/test-helpers.ts";
import type { ReactNode } from "react";

const BuriedHarness = function BuriedHarness(): ReactNode {
  const overlay = useOverlay();
  const handles = useRef(new Map<string, OverlayHandle<undefined>>());
  const mode = useMode();
  useCommand({
    handler: () => {
      handles.current.set(
        "under",
        overlay.open("under", (): ReactNode => <text content="under-overlay" />, undefined, {
          mode: "insert",
        }),
      );
    },
    hotkey: "u",
    id: "test.open-under",
    modes: ["cursor", "insert", "select"],
    title: "Open under",
  });
  useCommand({
    handler: () => {
      handles.current.set(
        "over",
        overlay.open("over", (): ReactNode => <text content="over-overlay" />, undefined, {
          mode: "select",
        }),
      );
    },
    hotkey: "v",
    id: "test.open-over",
    modes: ["cursor", "insert", "select"],
    title: "Open over",
  });
  useCommand({
    handler: () => {
      handles.current.get("under")?.close();
    },
    hotkey: "w",
    id: "test.close-under",
    modes: ["cursor", "insert", "select"],
    title: "Close under",
  });
  useCommand({
    handler: () => {
      handles.current.get("over")?.close();
    },
    hotkey: "x",
    id: "test.close-over",
    modes: ["cursor", "insert", "select"],
    title: "Close over",
  });
  return <text content={`hostmode:${mode}`} />;
};

const createOverlayA = (): ReactNode => <text content="overlay-a" />;
const createOverlayB = (): ReactNode => <text content="overlay-b" />;
const createReplacedOverlayA = (): ReactNode => <text content="overlay-a-replaced" />;
const createEscapeDismissibleOverlay = (): ReactNode => <text content="overlay-escape" />;
const createEscapePersistentOverlay = (): ReactNode => <text content="overlay-persistent" />;
const createAppLayoutOverlay = (): ReactNode => <text content="OVERLAY_CONTENT" />;

const OverlayHarness = function OverlayHarness(): ReactNode {
  const overlay = useOverlay();
  const handles = useRef(new Map<string, OverlayHandle<undefined>>());
  const current = useCurrentOverlay();
  const has = useHasOverlay();
  const open = (id: string, render: () => ReactNode, options?: OverlayOpenOptions): void => {
    handles.current.set(id, overlay.open(id, render, undefined, options));
  };

  useCommand({
    handler: () => {
      open("a", createOverlayA);
    },
    hotkey: "a",
    id: "test.show-a",
    modes: ["cursor"],
    title: "Show A",
  });

  useCommand({
    handler: () => {
      open("b", createOverlayB);
    },
    hotkey: "b",
    id: "test.show-b",
    modes: ["cursor"],
    title: "Show B",
  });

  useCommand({
    handler: () => {
      handles.current.get("a")?.close();
    },
    hotkey: "x",
    id: "test.hide-a",
    modes: ["cursor"],
    title: "Hide A",
  });

  useCommand({
    handler: () => {
      handles.current.get("b")?.close();
    },
    hotkey: "y",
    id: "test.hide-b",
    modes: ["cursor"],
    title: "Hide B",
  });

  useCommand({
    handler: () => {
      open("a", createReplacedOverlayA);
    },
    hotkey: "r",
    id: "test.replace-a",
    modes: ["cursor"],
    title: "Replace A",
  });

  useCommand({
    handler: () => {
      open("escape", createEscapeDismissibleOverlay, { mode: "insert" });
    },
    hotkey: "e",
    id: "test.show-escape-dismissible",
    modes: ["cursor"],
    title: "Show Escape Dismissible",
  });

  useCommand({
    handler: () => {
      open("persistent", createEscapePersistentOverlay, {
        dismissOnEscape: false,
        mode: "insert",
      });
    },
    hotkey: "p",
    id: "test.show-escape-persistent",
    modes: ["cursor"],
    title: "Show Escape Persistent",
  });

  return (
    <box flexDirection="column">
      <text content={`has:${has}`} />
      <text
        content={`current:${current === null || current === false || current === "" || current === 0 || current === 0n ? "no" : "yes"}`}
      />
    </box>
  );
};

const AppLayoutOverlayHarness = function AppLayoutOverlayHarness(): ReactNode {
  const overlay = useOverlay();
  const handle = useRef<OverlayHandle<null> | null>(null);

  useCommand({
    handler: () => {
      handle.current = overlay.open("test", createAppLayoutOverlay, null);
    },
    hotkey: "s",
    id: "test.show-overlay",
    modes: ["cursor"],
    title: "Show",
  });

  useCommand({
    handler: () => {
      handle.current?.close();
    },
    hotkey: "h",
    id: "test.hide-overlay",
    modes: ["cursor"],
    title: "Hide",
  });

  return (
    <AppLayout statusBar={{ items: [{ label: "Mode:", value: "cursor" }] }}>
      <text content="main-content" />
    </AppLayout>
  );
};

const setup = async function setup(component: ReactNode) {
  const s = await testRender(<TooeeProvider>{component}</TooeeProvider>, {
    height: 24,
    kittyKeyboard: true,
    width: 80,
  });
  await s.renderOnce();
  return s;
};

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("overlay system", () => {
  test("initially has no overlay", async () => {
    testSetup = await setup(<OverlayHarness />);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("has:false");
    expect(frame).toContain("current:no");
  });

  test("show makes overlay visible", async () => {
    testSetup = await setup(<OverlayHarness />);
    await press(testSetup, "a");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("has:true");
    expect(frame).toContain("current:yes");
  });

  test("hide removes overlay", async () => {
    testSetup = await setup(<OverlayHarness />);
    await press(testSetup, "a");
    expect(testSetup.captureCharFrame()).toContain("has:true");
    await press(testSetup, "x");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("has:false");
    expect(frame).toContain("current:no");
  });

  test("last overlay shown is current (stack behavior)", async () => {
    testSetup = await setup(<OverlayHarness />);
    await press(testSetup, "a");
    await press(testSetup, "b");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("has:true");
  });

  test("hiding top overlay reveals the one below", async () => {
    testSetup = await setup(<OverlayHarness />);
    await press(testSetup, "a");
    await press(testSetup, "b");
    await press(testSetup, "y");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("has:true");
    expect(frame).toContain("current:yes");
  });

  test("same ID replaces existing overlay (no duplicates)", async () => {
    testSetup = await setup(<OverlayHarness />);
    await press(testSetup, "a");
    await press(testSetup, "r");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("has:true");
    // Hide once should remove the replaced overlay entirely
    await press(testSetup, "x");
    const frame2 = testSetup.captureCharFrame();
    expect(frame2).toContain("has:false");
  });

  test("hiding non-existent ID is a no-op", async () => {
    testSetup = await setup(<OverlayHarness />);
    await press(testSetup, "x");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("has:false");
  });

  test("Escape closes overlays by default", async () => {
    testSetup = await setup(<OverlayHarness />);
    await press(testSetup, "e");
    expect(testSetup.captureCharFrame()).toContain("has:true");
    await pressEscape(testSetup);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("has:false");
    expect(frame).toContain("current:no");
  });

  test("Escape does not close overlays with dismissOnEscape false", async () => {
    testSetup = await setup(<OverlayHarness />);
    await press(testSetup, "p");
    expect(testSetup.captureCharFrame()).toContain("has:true");
    await pressEscape(testSetup);
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("has:true");
    expect(frame).toContain("current:yes");
  });

  test("overlay renders in AppLayout via context", async () => {
    testSetup = await setup(<AppLayoutOverlayHarness />);
    const frameBefore = testSetup.captureCharFrame();
    expect(frameBefore).toContain("main-content");
    expect(frameBefore).not.toContain("OVERLAY_CONTENT");
    await press(testSetup, "s");
    const frameAfter = testSetup.captureCharFrame();
    expect(frameAfter).toContain("OVERLAY_CONTENT");
  });
});

describe("overlay lifecycle correctness (R-04)", () => {
  test("replacing a same-id overlay fires onClose with 'replaced'", async () => {
    const reasons: OverlayCloseReason[] = [];

    const ReplaceHarness = function ReplaceHarness(): ReactNode {
      const overlay = useOverlay();
      useCommand({
        handler: () => {
          overlay.open("dup", (): ReactNode => <text content="dup-overlay" />, undefined, {
            mode: null,
            onClose: (reason) => {
              reasons.push(reason);
            },
          });
        },
        hotkey: "a",
        id: "test.open",
        modes: ["cursor"],
        title: "Open",
      });
      return <text content="replace-harness" />;
    };

    testSetup = await setup(<ReplaceHarness />);
    await press(testSetup, "a");
    expect(reasons).toEqual([]);
    await press(testSetup, "a");
    expect(reasons).toEqual(["replaced"]);
  });

  test("closing a buried legacy overlay does not clobber the mode set by the one above", async () => {
    testSetup = await setup(<BuriedHarness />);
    expect(testSetup.captureCharFrame()).toContain("hostmode:cursor");

    await press(testSetup, "u");
    expect(testSetup.captureCharFrame()).toContain("hostmode:insert");

    await press(testSetup, "v");
    expect(testSetup.captureCharFrame()).toContain("hostmode:select");

    await press(testSetup, "w");
    expect(testSetup.captureCharFrame()).toContain("hostmode:select");

    await press(testSetup, "x");
    expect(testSetup.captureCharFrame()).toContain("hostmode:insert");
  });
});
