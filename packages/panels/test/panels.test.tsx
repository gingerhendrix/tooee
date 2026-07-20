import { testRender } from "../../../test/support/test-render.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, useState } from "react";
import type { ReactNode } from "react";
import { CommandProvider, useCommand } from "@tooee/commands";
import {
  Outlet,
  RouterProvider,
  createRoute,
  createRouter,
  useNavigate,
  useRouterCommands,
  useScreenEffect,
} from "@tooee/router";
import type { RouterInstance } from "@tooee/router";
import { Panel, PanelGroup, usePanelState, usePanels } from "../src/index.js";

type TestSession = Awaited<ReturnType<typeof testRender>>;

const RENDER_OPTIONS = { height: 24, kittyKeyboard: true, width: 80 } as const;

const settle = async function settle(current: TestSession): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
  await current.renderOnce();
};

const pressKey = async function pressKey(
  current: TestSession,
  key: string,
  modifiers?: { ctrl?: boolean; shift?: boolean },
): Promise<void> {
  await act(async () => {
    current.mockInput.pressKey(key, modifiers);
    await Promise.resolve();
  });
  await current.renderOnce();
};

const pressTab = async function pressTab(
  current: TestSession,
  modifiers?: { shift?: boolean },
): Promise<void> {
  await act(async () => {
    current.mockInput.pressTab(modifiers);
    await Promise.resolve();
  });
  await current.renderOnce();
};

const pressBackspace = async function pressBackspace(current: TestSession): Promise<void> {
  await act(async () => {
    current.mockInput.pressBackspace();
    await Promise.resolve();
  });
  await current.renderOnce();
};

// Per-test observation state (reset in beforeEach), kept at module scope so the
// components that read it can also live at module scope.
let requested: string[] = [];
let effectLog: string[] = [];
let focusLog = new Set<string>();

/** Reports its panel's active state, a local counter, and a hotkey-driven command. */
const Probe = function Probe({ id, hotkey }: { id: string; hotkey: string }): ReactNode {
  const { isActive } = usePanelState();
  const [count, setCount] = useState(0);
  useCommand({
    handler: () => {
      setCount((current) => current + 1);
    },
    hotkey,
    id: `${id}.hit`,
    title: `${id} hit`,
  });
  return <text content={`${id}=${isActive ? "A" : "-"}:${count}`} />;
};

const CycleApp = function CycleApp({ disabledB }: { disabledB?: boolean }): ReactNode {
  return (
    <CommandProvider>
      <PanelGroup defaultActivePanelId="a">
        <Panel id="a" chrome="none">
          <Probe id="a" hotkey="x" />
        </Panel>
        <Panel id="b" chrome="none" disabled={disabledB}>
          <Probe id="b" hotkey="y" />
        </Panel>
        <Panel id="c" chrome="none">
          <Probe id="c" hotkey="z" />
        </Panel>
      </PanelGroup>
    </CommandProvider>
  );
};

const ActivateOuterRight = function ActivateOuterRight(): null {
  const { activate } = usePanels();
  useCommand({
    handler: () => {
      activate("right");
    },
    hotkey: "0",
    id: "outer.activate-right",
    title: "Activate outer right",
  });
  return null;
};

const NestedGroupsApp = function NestedGroupsApp(): ReactNode {
  return (
    <CommandProvider>
      <PanelGroup id="outer" defaultActivePanelId="left">
        <ActivateOuterRight />
        <Panel id="left" chrome="none">
          <Probe id="outer-left" hotkey="x" />
          <PanelGroup id="inner" defaultActivePanelId="inner-a">
            <Panel id="inner-a" chrome="none">
              <Probe id="inner-a" hotkey="n" />
            </Panel>
            <Panel id="inner-b" chrome="none">
              <Probe id="inner-b" hotkey="m" />
            </Panel>
          </PanelGroup>
        </Panel>
        <Panel id="right" chrome="none">
          <Probe id="outer-right" hotkey="r" />
        </Panel>
      </PanelGroup>
    </CommandProvider>
  );
};

const SiblingGroupsInner = function SiblingGroupsInner(): ReactNode {
  const [showSecond, setShowSecond] = useState(true);
  useCommand({
    handler: () => {
      setShowSecond(false);
    },
    hotkey: "0",
    id: "siblings.remove-second",
    title: "Remove second group",
  });
  return (
    <>
      <PanelGroup id="first" defaultActivePanelId="first-a">
        <Panel id="first-a" chrome="none">
          <Probe id="first-a" hotkey="f" />
        </Panel>
        <Panel id="first-b" chrome="none">
          <Probe id="first-b" hotkey="g" />
        </Panel>
      </PanelGroup>
      {showSecond ? (
        <PanelGroup id="second" defaultActivePanelId="second-a">
          <Panel id="second-a" chrome="none">
            <Probe id="second-a" hotkey="s" />
          </Panel>
          <Panel id="second-b" chrome="none">
            <Probe id="second-b" hotkey="t" />
          </Panel>
        </PanelGroup>
      ) : null}
    </>
  );
};

const SiblingGroupsApp = function SiblingGroupsApp(): ReactNode {
  return (
    <CommandProvider>
      <SiblingGroupsInner />
    </CommandProvider>
  );
};

// The test renderer's root.render() remounts the tree, so props are driven
// through internal state (flipped by a command) rather than re-rendering.
const ControlledInner = function ControlledInner(): ReactNode {
  const [controlled, setControlled] = useState("a");
  useCommand({
    handler: () => {
      setControlled("b");
    },
    hotkey: "0",
    id: "apply",
    title: "apply",
  });
  return (
    <PanelGroup
      activePanelId={controlled}
      onActivePanelChange={(id) => {
        requested.push(id);
      }}
    >
      <Panel id="a" chrome="none">
        <Probe id="a" hotkey="x" />
      </Panel>
      <Panel id="b" chrome="none">
        <Probe id="b" hotkey="y" />
      </Panel>
    </PanelGroup>
  );
};

const ControlledApp = function ControlledApp(): ReactNode {
  return (
    <CommandProvider>
      <ControlledInner />
    </CommandProvider>
  );
};

const RepairInner = function RepairInner(): ReactNode {
  const [showB, setShowB] = useState(true);
  const [disabledB, setDisabledB] = useState(false);
  useCommand({
    handler: () => {
      setShowB(false);
    },
    hotkey: "0",
    id: "unmount-b",
    title: "unmount b",
  });
  useCommand({
    handler: () => {
      setDisabledB(true);
    },
    hotkey: "9",
    id: "disable-b",
    title: "disable b",
  });
  return (
    <PanelGroup defaultActivePanelId="a">
      <Panel id="a" chrome="none">
        <Probe id="a" hotkey="x" />
      </Panel>
      {showB ? (
        <Panel id="b" chrome="none" disabled={disabledB}>
          <Probe id="b" hotkey="y" />
        </Panel>
      ) : null}
      <Panel id="c" chrome="none">
        <Probe id="c" hotkey="z" />
      </Panel>
    </PanelGroup>
  );
};

const RepairApp = function RepairApp(): ReactNode {
  return (
    <CommandProvider>
      <RepairInner />
    </CommandProvider>
  );
};

const Effectful = function Effectful({ id }: { id: string }): ReactNode {
  useScreenEffect(() => {
    effectLog.push(`${id}:on`);
    return () => {
      effectLog.push(`${id}:off`);
    };
  });
  return <text content={`eff:${id}`} />;
};

// A real router leaf that reports focus via the shared focus log.
const FocusReporter = function FocusReporter({ id }: { id: string }): ReactNode {
  useNavigate();
  useScreenEffect(() => {
    focusLog.add(id);
    return () => {
      focusLog.delete(id);
    };
  });
  return <text content={`route:${id}`} />;
};

const LeftInbox = (): ReactNode => <text content="left:inbox" />;
const LeftThread = (): ReactNode => <text content="left:thread" />;
const RightPreview = (): ReactNode => <text content="right:preview" />;
const RightDetail = (): ReactNode => <text content="right:detail" />;
const LeftLeaf = (): ReactNode => <FocusReporter id="left" />;
const RightLeaf = (): ReactNode => <FocusReporter id="right" />;

const makeStackRouters = function makeStackRouters(): {
  left: RouterInstance;
  right: RouterInstance;
} {
  const inbox = createRoute({ component: LeftInbox, id: "inbox" });
  const thread = createRoute({ component: LeftThread, id: "thread" });
  const preview = createRoute({ component: RightPreview, id: "preview" });
  const detail = createRoute({ component: RightDetail, id: "detail" });
  return {
    left: createRouter({ defaultRoute: "inbox", routes: [inbox, thread] }),
    right: createRouter({ defaultRoute: "preview", routes: [preview, detail] }),
  };
};

const RouterPane = function RouterPane(): ReactNode {
  useRouterCommands();
  return <Outlet />;
};

let session: TestSession | undefined;

beforeEach(() => {
  requested = [];
  effectLog = [];
  focusLog = new Set<string>();
});

afterEach(() => {
  session?.renderer.destroy();
  session = undefined;
});

describe("panel switching", () => {
  test("Tab cycles forward in source order and wraps; Shift+Tab reverses", async () => {
    session = await testRender(<CycleApp />, RENDER_OPTIONS);
    await settle(session);
    expect(session.captureCharFrame()).toContain("a=A:0");

    await pressTab(session);
    expect(session.captureCharFrame()).toContain("b=A:0");
    await pressTab(session);
    expect(session.captureCharFrame()).toContain("c=A:0");
    // Wrap last -> first.
    await pressTab(session);
    expect(session.captureCharFrame()).toContain("a=A:0");
    // Shift+Tab wraps first -> last.
    await pressTab(session, { shift: true });
    expect(session.captureCharFrame()).toContain("c=A:0");
  });

  test("Tab skips disabled panels", async () => {
    session = await testRender(<CycleApp disabledB />, RENDER_OPTIONS);
    await settle(session);
    expect(session.captureCharFrame()).toContain("a=A:0");
    // b is disabled, so next after a is c.
    await pressTab(session);
    const frame = session.captureCharFrame();
    expect(frame).toContain("c=A:0");
    expect(frame).toContain("b=-:0");
  });

  test("only the active panel's command dispatches; others fall through", async () => {
    session = await testRender(<CycleApp />, RENDER_OPTIONS);
    await settle(session);

    // 'x' hits panel a (active); 'y' belongs to inactive b and does nothing.
    await pressKey(session, "x");
    await pressKey(session, "y");
    let frame = session.captureCharFrame();
    expect(frame).toContain("a=A:1");
    expect(frame).toContain("b=-:0");

    // Activate b, then 'y' hits it.
    await pressTab(session);
    await pressKey(session, "y");
    frame = session.captureCharFrame();
    expect(frame).toContain("b=A:1");
    expect(frame).toContain("a=-:1");
  });
});

describe("controlled activation", () => {
  test("a controlled group never self-activates; it only requests via onActivePanelChange", async () => {
    session = await testRender(<ControlledApp />, RENDER_OPTIONS);
    await settle(session);
    expect(session.captureCharFrame()).toContain("a=A:0");

    // Tab requests "b" but the group does not move on its own.
    await pressTab(session);
    expect(requested).toContain("b");
    expect(session.captureCharFrame()).toContain("a=A:0");

    // The parent applies the request by updating the controlled prop.
    await pressKey(session, "0");
    expect(session.captureCharFrame()).toContain("b=A:0");
  });

  test("an explicit null controlled id represents no active panel", async () => {
    session = await testRender(
      <CommandProvider>
        <PanelGroup
          activePanelId={null}
          onActivePanelChange={(id) => {
            requested.push(id);
          }}
        >
          <Panel id="a" chrome="none">
            <Probe id="a" hotkey="x" />
          </Panel>
          <Panel id="b" chrome="none">
            <Probe id="b" hotkey="y" />
          </Panel>
        </PanelGroup>
      </CommandProvider>,
      RENDER_OPTIONS,
    );
    await settle(session);

    const frame = session.captureCharFrame();
    expect(frame).toContain("a=-:0");
    expect(frame).toContain("b=-:0");
    expect(requested).toEqual([]);
  });

  test("an empty uncontrolled group does not emit a null change", async () => {
    session = await testRender(
      <CommandProvider>
        <PanelGroup
          onActivePanelChange={(id) => {
            requested.push(id);
          }}
        >
          <text content="EMPTY GROUP" />
        </PanelGroup>
      </CommandProvider>,
      RENDER_OPTIONS,
    );
    await settle(session);

    expect(session.captureCharFrame()).toContain("EMPTY GROUP");
    expect(requested).toEqual([]);
  });
});

describe("group ownership and command lifecycle", () => {
  test("a nested group stops owning keys while its enclosing panel is inactive", async () => {
    session = await testRender(<NestedGroupsApp />, RENDER_OPTIONS);
    await settle(session);

    await pressKey(session, "n");
    expect(session.captureCharFrame()).toContain("inner-a=A:1");

    // The root control deactivates the outer panel that contains the inner group.
    await pressKey(session, "0");
    expect(session.captureCharFrame()).toContain("outer-right=A:0");

    await pressKey(session, "n");
    const frame = session.captureCharFrame();
    expect(frame).toContain("inner-a=A:1");
    expect(frame).toContain("outer-right=A:0");
  });

  test("sibling switch commands survive the current group unmounting", async () => {
    session = await testRender(<SiblingGroupsApp />, RENDER_OPTIONS);
    await settle(session);

    // The later sibling owns the keyboard; its local switch command advances it.
    await pressTab(session);
    let frame = session.captureCharFrame();
    expect(frame).toContain("second-b=A:0");
    expect(frame).toContain("first-a=A:0");

    // Removing that group must reveal a still-live switch command for the first.
    await pressKey(session, "0");
    await pressTab(session);
    frame = session.captureCharFrame();
    expect(frame).toContain("first-b=A:0");
    expect(frame).not.toContain("second-a=");
    expect(frame).not.toContain("second-b=");
  });
});

describe("activation repair", () => {
  test("unmounting the active panel repairs to the next in order", async () => {
    session = await testRender(<RepairApp />, RENDER_OPTIONS);
    await settle(session);
    // Activate b, then unmount it -> repair to next-in-order (c).
    await pressTab(session);
    expect(session.captureCharFrame()).toContain("b=A:0");

    await pressKey(session, "0");
    expect(session.captureCharFrame()).toContain("c=A:0");
  });

  test("disabling the active panel repairs to another activatable panel", async () => {
    session = await testRender(<RepairApp />, RENDER_OPTIONS);
    await settle(session);
    await pressTab(session);
    expect(session.captureCharFrame()).toContain("b=A:0");

    await pressKey(session, "9");
    const frame = session.captureCharFrame();
    expect(frame).toContain("c=A:0");
    expect(frame).toContain("b=-:0");
  });
});

describe("state preservation & chrome", () => {
  test("panel-local state survives deactivation (panels stay mounted)", async () => {
    session = await testRender(<CycleApp />, RENDER_OPTIONS);
    await settle(session);

    await pressKey(session, "x");
    await pressKey(session, "x");
    expect(session.captureCharFrame()).toContain("a=A:2");

    // Switch away and back; a's local counter is retained.
    await pressTab(session);
    await pressTab(session);
    await pressTab(session);
    expect(session.captureCharFrame()).toContain("a=A:2");
  });

  test("default chrome marks the active panel title and moves the marker on switch", async () => {
    session = await testRender(
      <CommandProvider>
        <box flexDirection="row" width="100%" height="100%">
          <PanelGroup defaultActivePanelId="a">
            <Panel id="a" title="Left" style={{ flexGrow: 1 }}>
              <Probe id="a" hotkey="x" />
            </Panel>
            <Panel id="b" title="Right" style={{ flexGrow: 1 }}>
              <Probe id="b" hotkey="y" />
            </Panel>
          </PanelGroup>
        </box>
      </CommandProvider>,
      RENDER_OPTIONS,
    );
    await settle(session);

    let frame = session.captureCharFrame();
    expect(frame).toContain("▸ Left");
    expect(frame).not.toContain("▸ Right");

    await pressTab(session);
    frame = session.captureCharFrame();
    expect(frame).toContain("▸ Right");
    expect(frame).not.toContain("▸ Left");
  });

  test("usePanels reports ordered ids and the reactive active id", async () => {
    const seen: { ids: readonly string[]; active: string | null }[] = [];
    const Reporter = function Reporter(): ReactNode {
      const { panelIds, activePanelId } = usePanels();
      seen.push({ active: activePanelId, ids: panelIds });
      return null;
    };
    session = await testRender(
      <CommandProvider>
        <PanelGroup defaultActivePanelId="a">
          <Reporter />
          <Panel id="a" chrome="none">
            <Probe id="a" hotkey="x" />
          </Panel>
          <Panel id="b" chrome="none">
            <Probe id="b" hotkey="y" />
          </Panel>
        </PanelGroup>
      </CommandProvider>,
      RENDER_OPTIONS,
    );
    await settle(session);
    await pressTab(session);

    const last = seen.at(-1);
    expect(last?.ids).toEqual(["a", "b"]);
    expect(last?.active).toBe("b");
  });
});

describe("router composition inside panels", () => {
  test("two panel-local routers keep independent stacks across switching", async () => {
    const { left, right } = makeStackRouters();
    session = await testRender(
      <CommandProvider>
        <PanelGroup defaultActivePanelId="left">
          <Panel id="left" chrome="none">
            <RouterProvider router={left}>
              <Outlet />
            </RouterProvider>
          </Panel>
          <Panel id="right" chrome="none">
            <RouterProvider router={right}>
              <Outlet />
            </RouterProvider>
          </Panel>
        </PanelGroup>
      </CommandProvider>,
      RENDER_OPTIONS,
    );
    await settle(session);

    await act(async () => {
      left.push("thread");
      await Promise.resolve();
    });
    await session.renderOnce();
    expect(session.captureCharFrame()).toContain("left:thread");
    expect(session.captureCharFrame()).toContain("right:preview");

    // Switching panels must not disturb either stack (panels stay mounted).
    await pressTab(session);
    await pressTab(session);
    const frame = session.captureCharFrame();
    expect(frame).toContain("left:thread");
    expect(frame).toContain("right:preview");
  });

  test("Backspace pops only the active panel's router stack", async () => {
    const { left, right } = makeStackRouters();
    session = await testRender(
      <CommandProvider>
        <PanelGroup defaultActivePanelId="left">
          <Panel id="left" chrome="none">
            <RouterProvider router={left}>
              <RouterPane />
            </RouterProvider>
          </Panel>
          <Panel id="right" chrome="none">
            <RouterProvider router={right}>
              <RouterPane />
            </RouterProvider>
          </Panel>
        </PanelGroup>
      </CommandProvider>,
      RENDER_OPTIONS,
    );
    await settle(session);

    await act(async () => {
      left.push("thread");
      right.push("detail");
      await Promise.resolve();
    });
    await session.renderOnce();
    expect(session.captureCharFrame()).toContain("left:thread");
    expect(session.captureCharFrame()).toContain("right:detail");

    // Left is active: Backspace pops the left stack only.
    await pressBackspace(session);
    let frame = session.captureCharFrame();
    expect(frame).toContain("left:inbox");
    expect(frame).toContain("right:detail");

    // Activate right: Backspace now pops the right stack only.
    await pressTab(session);
    await pressBackspace(session);
    frame = session.captureCharFrame();
    expect(frame).toContain("left:inbox");
    expect(frame).toContain("right:preview");
  });
});

describe("screen focus composition", () => {
  test("useScreenEffect pauses in an inactive panel and resumes on reactivation", async () => {
    session = await testRender(
      <CommandProvider>
        <PanelGroup defaultActivePanelId="a">
          <Panel id="a" chrome="none">
            <Effectful id="a" />
          </Panel>
          <Panel id="b" chrome="none">
            <Effectful id="b" />
          </Panel>
        </PanelGroup>
      </CommandProvider>,
      RENDER_OPTIONS,
    );
    await settle(session);
    // Only the active panel's effect runs.
    expect(effectLog).toContain("a:on");
    expect(effectLog).not.toContain("b:on");

    // Switch to b: a's effect cleans up, b's runs.
    await pressTab(session);
    expect(effectLog).toContain("a:off");
    expect(effectLog).toContain("b:on");

    // Switch back: b cleans up, a re-runs.
    effectLog = [];
    await pressTab(session);
    expect(effectLog).toContain("b:off");
    expect(effectLog).toContain("a:on");
  });

  test("a leaf route inside the active panel stays focused; an inactive panel's leaf does not", async () => {
    const leftLeaf = createRoute({ component: LeftLeaf, id: "l" });
    const rightLeaf = createRoute({ component: RightLeaf, id: "r" });
    const left = createRouter({ defaultRoute: "l", routes: [leftLeaf] });
    const right = createRouter({ defaultRoute: "r", routes: [rightLeaf] });

    session = await testRender(
      <CommandProvider>
        <PanelGroup defaultActivePanelId="left">
          <Panel id="left" chrome="none">
            <RouterProvider router={left}>
              <Outlet />
            </RouterProvider>
          </Panel>
          <Panel id="right" chrome="none">
            <RouterProvider router={right}>
              <Outlet />
            </RouterProvider>
          </Panel>
        </PanelGroup>
      </CommandProvider>,
      RENDER_OPTIONS,
    );
    await settle(session);
    // The active panel's leaf is focused (scope AND route-leaf); the inactive one is not.
    expect(focusLog.has("left")).toBe(true);
    expect(focusLog.has("right")).toBe(false);
  });
});
