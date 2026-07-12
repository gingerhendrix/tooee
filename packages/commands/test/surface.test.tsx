import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import type { ReactNode } from "react";
import { useKeyboard } from "@opentui/react";
import {
  CommandProvider,
  CommandSurfaceProvider,
  useActiveCommandSurface,
  useCommand,
  useMode,
  useSetMode,
} from "../src/index.js";
import type { CommandSurfaceRole } from "../src/index.js";

type TestSession = Awaited<ReturnType<typeof testRender>>;

async function press(
  session: TestSession,
  key: string,
  modifiers?: { ctrl?: boolean; shift?: boolean },
) {
  await act(async () => {
    session.mockInput.pressKey(key, modifiers);
  });
  await session.renderOnce();
}

async function pressEscape(session: TestSession) {
  await act(async () => {
    session.mockInput.pressEscape();
  });
  await session.renderOnce();
}

function SurfaceA({
  children,
  onAction,
  onClose,
  onOpenNested,
}: {
  children?: ReactNode;
  onAction: () => void;
  onClose: () => void;
  onOpenNested: () => void;
}) {
  const mode = useMode();
  const setMode = useSetMode();

  useCommand({ id: "a.action", title: "A action", hotkey: "a", handler: onAction });
  useCommand({ id: "a.close", title: "Close A", hotkey: "Escape", handler: onClose });
  useCommand({ id: "a.nested", title: "Open nested", hotkey: "n", handler: onOpenNested });
  useCommand({
    id: "a.insert",
    title: "Insert mode",
    hotkey: "m",
    handler: () => setMode("insert"),
  });

  return (
    <box flexDirection="column">
      <text content={`amode:${mode}`} />
      {children}
    </box>
  );
}

function SurfaceB({ onAction, onClose }: { onAction: () => void; onClose: () => void }) {
  useCommand({ id: "b.action", title: "B action", hotkey: "b", handler: onAction });
  useCommand({ id: "b.close", title: "Close B", hotkey: "Escape", handler: onClose });
  return <text content="surface-b" />;
}

function Harness({ aRole = "modal" }: { aRole?: CommandSurfaceRole }) {
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);
  const [rootQuit, setRootQuit] = useState(0);
  const [rootAction, setRootAction] = useState(0);
  const [aAction, setAAction] = useState(0);
  const [bAction, setBAction] = useState(0);
  const rootMode = useMode();
  const active = useActiveCommandSurface();

  useCommand({
    id: "root.quit",
    title: "Quit",
    hotkey: "q",
    handler: () => setRootQuit((n) => n + 1),
  });
  useCommand({
    id: "root.action",
    title: "Root action",
    hotkey: "a",
    handler: () => setRootAction((n) => n + 1),
  });
  useCommand({ id: "root.open", title: "Open A", hotkey: "o", handler: () => setShowA(true) });

  return (
    <box flexDirection="column">
      <text content={`rootmode:${rootMode}`} />
      <text content={`rootQuit:${rootQuit}`} />
      <text content={`rootAction:${rootAction}`} />
      <text content={`aAction:${aAction}`} />
      <text content={`bAction:${bAction}`} />
      <text content={`active:${active ? active.id : "root"}`} />
      {showA && (
        <CommandSurfaceProvider id="surfaceA" role={aRole} initialMode="cursor">
          <SurfaceA
            onAction={() => setAAction((n) => n + 1)}
            onClose={() => setShowA(false)}
            onOpenNested={() => setShowB(true)}
          >
            {showB && (
              <CommandSurfaceProvider id="surfaceB" role="modal" initialMode="cursor">
                <SurfaceB
                  onAction={() => setBAction((n) => n + 1)}
                  onClose={() => setShowB(false)}
                />
              </CommandSurfaceProvider>
            )}
          </SurfaceA>
        </CommandSurfaceProvider>
      )}
    </box>
  );
}

async function setup(aRole: CommandSurfaceRole = "modal") {
  const session = await testRender(
    <CommandProvider>
      <Harness aRole={aRole} />
    </CommandProvider>,
    { width: 60, height: 24, kittyKeyboard: true },
  );
  await session.renderOnce();
  return session;
}

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("command surface arbitration", () => {
  test("root commands run when no surface is active", async () => {
    testSetup = await setup();
    expect(testSetup.captureCharFrame()).toContain("active:root");
    await press(testSetup, "a");
    await press(testSetup, "q");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("rootAction:1");
    expect(frame).toContain("rootQuit:1");
  });

  test("a modal surface becomes the active surface", async () => {
    testSetup = await setup();
    await press(testSetup, "o"); // open surface A
    expect(testSetup.captureCharFrame()).toContain("active:surfaceA");
  });

  test("modal surface shadows parent command sharing the same hotkey", async () => {
    testSetup = await setup();
    await press(testSetup, "o");
    await press(testSetup, "a"); // 'a' is bound on both root and surface A
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("aAction:1");
    expect(frame).toContain("rootAction:0"); // parent did not fire
  });

  test("unhandled keys do not bubble to parent while a modal surface is active", async () => {
    testSetup = await setup();
    await press(testSetup, "o");
    await press(testSetup, "q"); // 'q' (root quit) is not handled by surface A
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("rootQuit:0"); // parent quit suspended
  });

  test("nested modal surface shadows its parent surface", async () => {
    testSetup = await setup();
    await press(testSetup, "o"); // open A
    await press(testSetup, "n"); // open nested B
    expect(testSetup.captureCharFrame()).toContain("active:surfaceB");

    await press(testSetup, "a"); // bound on A, not on B -> swallowed
    await press(testSetup, "b"); // bound on B
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("bAction:1");
    expect(frame).toContain("aAction:0"); // parent surface shadowed

    await pressEscape(testSetup); // closes B only
    frame = testSetup.captureCharFrame();
    expect(frame).toContain("active:surfaceA");

    await press(testSetup, "a"); // A is active again
    expect(testSetup.captureCharFrame()).toContain("aAction:1");
  });

  test("local surface mode does not leak into the root mode", async () => {
    testSetup = await setup();
    await press(testSetup, "o");
    await press(testSetup, "m"); // surface A: setMode("insert")
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("amode:insert");
    expect(frame).toContain("rootmode:cursor"); // root mode untouched
  });

  test("closing a surface restores parent command dispatch", async () => {
    testSetup = await setup();
    await press(testSetup, "o");
    await pressEscape(testSetup); // a.close
    expect(testSetup.captureCharFrame()).toContain("active:root");
    await press(testSetup, "q"); // root quit works again
    expect(testSetup.captureCharFrame()).toContain("rootQuit:1");
  });

  test("raw useKeyboard consumers bypass surface arbitration and must guard themselves", async () => {
    // Raw useKeyboard handlers subscribe before the command dispatcher (child
    // effects run first), so a modal surface cannot suspend them and
    // preventDefault cannot protect them. App-level raw handlers MUST stand
    // down while a modal surface is active (see useHasOverlay in @tooee/overlays
    // or useActiveCommandSurface here). This test documents the hazard: the
    // unguarded handler still fires while a modal surface owns input; the
    // guarded handler does not.
    function RawKeyboardHarness() {
      const [showSurface, setShowSurface] = useState(false);
      const [unguarded, setUnguarded] = useState(0);
      const [guarded, setGuarded] = useState(0);
      const [surfaceAction, setSurfaceAction] = useState(0);
      const active = useActiveCommandSurface();

      useCommand({
        id: "root.open",
        title: "Open",
        hotkey: "o",
        handler: () => setShowSurface(true),
      });

      useKeyboard((key) => {
        if (key.name === "z") setUnguarded((n) => n + 1);
      });
      useKeyboard((key) => {
        if (active) return;
        if (key.name === "z") setGuarded((n) => n + 1);
      });

      return (
        <box flexDirection="column">
          <text content={`unguarded:${unguarded}`} />
          <text content={`guarded:${guarded}`} />
          <text content={`surfaceAction:${surfaceAction}`} />
          {showSurface && (
            <CommandSurfaceProvider id="modal" role="modal" initialMode="cursor">
              <ZCommandSurface onAction={() => setSurfaceAction((n) => n + 1)} />
            </CommandSurfaceProvider>
          )}
        </box>
      );
    }

    function ZCommandSurface({ onAction }: { onAction: () => void }) {
      useCommand({ id: "modal.z", title: "Z action", hotkey: "z", handler: onAction });
      return <text content="modal-surface" />;
    }

    testSetup = await testRender(
      <CommandProvider>
        <RawKeyboardHarness />
      </CommandProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    );
    await testSetup.renderOnce();

    // No surface active: both raw handlers fire.
    await press(testSetup, "z");
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("unguarded:1");
    expect(frame).toContain("guarded:1");

    // Open the modal surface; command dispatch is arbitrated to it, but the
    // unguarded raw handler still double-handles the key.
    await press(testSetup, "o");
    await press(testSetup, "z");
    frame = testSetup.captureCharFrame();
    expect(frame).toContain("surfaceAction:1"); // surface handled it
    expect(frame).toContain("unguarded:2"); // hazard: raw handler fired too
    expect(frame).toContain("guarded:1"); // guarded handler stood down
  });

  test("a passive surface never becomes the keyboard owner", async () => {
    testSetup = await setup("passive");
    await press(testSetup, "o"); // mount passive surface A
    expect(testSetup.captureCharFrame()).toContain("active:root"); // still root
    await press(testSetup, "a"); // routes to root, not the passive surface
    await press(testSetup, "q");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("rootAction:1");
    expect(frame).toContain("rootQuit:1");
    expect(frame).toContain("aAction:0"); // passive surface command never fired
  });
});
