import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { TooeeProvider } from "@tooee/shell";
import { useOverlay, useCurrentOverlay, useHasOverlay } from "@tooee/overlays";
import type { OverlayCloseReason } from "@tooee/overlays";
import { AppLayout } from "@tooee/layout";
import { useCommand, useMode } from "@tooee/commands";
import { press, pressEscape, type TestSession } from "./support/test-helpers.ts";

const createOverlayA = () => <text content="overlay-a" />;
const createOverlayB = () => <text content="overlay-b" />;
const createReplacedOverlayA = () => <text content="overlay-a-replaced" />;
const createEscapeDismissibleOverlay = () => <text content="overlay-escape" />;
const createEscapePersistentOverlay = () => <text content="overlay-persistent" />;
const createAppLayoutOverlay = () => <text content="OVERLAY_CONTENT" />;

function OverlayHarness() {
  const overlay = useOverlay();
  const current = useCurrentOverlay();
  const has = useHasOverlay();

  useCommand({
    id: "test.show-a",
    title: "Show A",
    hotkey: "a",
    modes: ["cursor"],
    handler: () => {
      overlay.show("a", createOverlayA());
    },
  });

  useCommand({
    id: "test.show-b",
    title: "Show B",
    hotkey: "b",
    modes: ["cursor"],
    handler: () => {
      overlay.show("b", createOverlayB());
    },
  });

  useCommand({
    id: "test.hide-a",
    title: "Hide A",
    hotkey: "x",
    modes: ["cursor"],
    handler: () => {
      overlay.hide("a");
    },
  });

  useCommand({
    id: "test.hide-b",
    title: "Hide B",
    hotkey: "y",
    modes: ["cursor"],
    handler: () => {
      overlay.hide("b");
    },
  });

  useCommand({
    id: "test.replace-a",
    title: "Replace A",
    hotkey: "r",
    modes: ["cursor"],
    handler: () => {
      overlay.show("a", createReplacedOverlayA());
    },
  });

  useCommand({
    id: "test.show-escape-dismissible",
    title: "Show Escape Dismissible",
    hotkey: "e",
    modes: ["cursor"],
    handler: () => {
      overlay.show("escape", createEscapeDismissibleOverlay(), { mode: "insert" });
    },
  });

  useCommand({
    id: "test.show-escape-persistent",
    title: "Show Escape Persistent",
    hotkey: "p",
    modes: ["cursor"],
    handler: () => {
      overlay.show("persistent", createEscapePersistentOverlay(), {
        mode: "insert",
        dismissOnEscape: false,
      });
    },
  });

  return (
    <box flexDirection="column">
      <text content={`has:${has}`} />
      <text content={`current:${current ? "yes" : "no"}`} />
    </box>
  );
}

function AppLayoutOverlayHarness() {
  const overlay = useOverlay();

  useCommand({
    id: "test.show-overlay",
    title: "Show",
    hotkey: "s",
    modes: ["cursor"],
    handler: () => {
      overlay.show("test", createAppLayoutOverlay());
    },
  });

  useCommand({
    id: "test.hide-overlay",
    title: "Hide",
    hotkey: "h",
    modes: ["cursor"],
    handler: () => {
      overlay.hide("test");
    },
  });

  return (
    <AppLayout statusBar={{ items: [{ label: "Mode:", value: "cursor" }] }}>
      <text content="main-content" />
    </AppLayout>
  );
}

async function setup(component: React.ReactNode) {
  const s = await testRender(<TooeeProvider>{component}</TooeeProvider>, {
    width: 80,
    height: 24,
    kittyKeyboard: true,
  });
  await s.renderOnce();
  return s;
}

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

    function ReplaceHarness() {
      const overlay = useOverlay();
      useCommand({
        id: "test.open",
        title: "Open",
        hotkey: "a",
        modes: ["cursor"],
        handler: () => {
          overlay.open("dup", () => <text content="dup-overlay" />, undefined, {
            mode: null,
            onClose: (reason) => reasons.push(reason),
          });
        },
      });
      return <text content="replace-harness" />;
    }

    testSetup = await setup(<ReplaceHarness />);
    await press(testSetup, "a");
    expect(reasons).toEqual([]);
    await press(testSetup, "a"); // same id again: first entry is replaced
    expect(reasons).toEqual(["replaced"]);
  });

  test("closing a buried legacy overlay does not clobber the mode set by the one above", async () => {
    function BuriedHarness() {
      const overlay = useOverlay();
      const mode = useMode();
      useCommand({
        id: "test.open-under",
        title: "Open under",
        hotkey: "u",
        modes: ["cursor", "insert", "select"],
        handler: () => {
          overlay.open("under", () => <text content="under-overlay" />, undefined, {
            mode: "insert",
          });
        },
      });
      useCommand({
        id: "test.open-over",
        title: "Open over",
        hotkey: "v",
        modes: ["cursor", "insert", "select"],
        handler: () => {
          overlay.open("over", () => <text content="over-overlay" />, undefined, {
            mode: "select",
          });
        },
      });
      useCommand({
        id: "test.close-under",
        title: "Close under",
        hotkey: "w",
        modes: ["cursor", "insert", "select"],
        handler: () => {
          overlay.hide("under");
        },
      });
      useCommand({
        id: "test.close-over",
        title: "Close over",
        hotkey: "x",
        modes: ["cursor", "insert", "select"],
        handler: () => {
          overlay.hide("over");
        },
      });
      return <text content={`hostmode:${mode}`} />;
    }

    testSetup = await setup(<BuriedHarness />);
    expect(testSetup.captureCharFrame()).toContain("hostmode:cursor");

    await press(testSetup, "u"); // legacy overlay "under" sets insert
    expect(testSetup.captureCharFrame()).toContain("hostmode:insert");

    await press(testSetup, "v"); // legacy overlay "over" sets select
    expect(testSetup.captureCharFrame()).toContain("hostmode:select");

    await press(testSetup, "w"); // close buried "under": must not restore its prevMode
    expect(testSetup.captureCharFrame()).toContain("hostmode:select");

    await press(testSetup, "x"); // close top "over": restores its prevMode
    expect(testSetup.captureCharFrame()).toContain("hostmode:insert");
  });
});
