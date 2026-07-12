import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import type { ReactNode } from "react";
import {
  CommandProvider,
  CommandSurfaceProvider,
  useActiveCommandSurface,
  useCommand,
  useCommandContext,
  useCommandSequenceState,
  useSetMode,
  useSurfaceCommands,
} from "../src/index.js";
import type { Mode } from "../src/index.js";

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const press = async function press(session: TestSession, key: string) {
  await act(async () => {
    session.mockInput.pressKey(key);
    await Promise.resolve();
  });
  await session.renderOnce();
};

const SequenceProbe = function SequenceProbe(): ReactNode {
  const sequence = useCommandSequenceState();
  return <text content={`pending:${sequence ? sequence.prefix.length : 0}`} />;
};

describe("F-08: mode changes reset a pending chord", () => {
  test("a surface-local setMode mid-chord clears the pending sequence", async () => {
    let fired = 0;
    let surfaceSetMode: ((mode: Mode) => void) | null = null;

    const SurfaceContent = function SurfaceContent(): ReactNode {
      const setMode = useSetMode();
      surfaceSetMode = setMode;
      // Available in both modes, so a completion after the mode change would
      // fire if the chord buffer survived the transition.
      useCommand({
        handler: () => fired++,
        hotkey: "g g",
        id: "s.chord",
        modes: ["cursor", "insert"],
        title: "Chord",
      });
      return <text content="surface" />;
    };

    testSetup = await testRender(
      <CommandProvider>
        <box flexDirection="column">
          <SequenceProbe />
          <CommandSurfaceProvider id="modal" role="modal" initialMode="cursor">
            <SurfaceContent />
          </CommandSurfaceProvider>
        </box>
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await press(testSetup, "g");
    expect(testSetup.captureCharFrame()).toContain("pending:1");

    // Surface-local mode change mid-chord: the sequence must reset.
    await act(async () => {
      surfaceSetMode!("insert");
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("pending:0");

    // Completing the old chord must NOT fire; it starts a fresh chord instead.
    await press(testSetup, "g");
    expect(fired).toBe(0);
    expect(testSetup.captureCharFrame()).toContain("pending:1");
  });

  test("a root setMode mid-chord clears the pending sequence", async () => {
    let fired = 0;
    let rootSetMode: ((mode: Mode) => void) | null = null;

    const Harness = function Harness(): ReactNode {
      const setMode = useSetMode();
      rootSetMode = setMode;
      useCommand({
        handler: () => fired++,
        hotkey: "g g",
        id: "root.chord",
        modes: ["cursor", "insert"],
        title: "Chord",
      });
      return <SequenceProbe />;
    };

    testSetup = await testRender(
      <CommandProvider>
        <Harness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await press(testSetup, "g");
    expect(testSetup.captureCharFrame()).toContain("pending:1");

    await act(async () => {
      rootSetMode!("insert");
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("pending:0");

    await press(testSetup, "g");
    expect(fired).toBe(0);
  });
});

describe("F-09: surface replacement resets a pending chord", () => {
  test("remounting a same-id modal surface mid-chord clears the pending sequence", async () => {
    let fired = 0;
    let swap: (() => void) | null = null;

    const SurfaceContent = function SurfaceContent(): ReactNode {
      useCommand({
        handler: () => fired++,
        hotkey: "g g",
        id: "s.chord",
        title: "Chord",
      });
      return <text content="surface" />;
    };

    const Harness = function Harness(): ReactNode {
      const [generation, setGeneration] = useState(0);
      swap = () => {
        setGeneration((g) => g + 1);
      };
      return (
        <box flexDirection="column">
          <SequenceProbe />
          {/* key remount = a new surface record under the same id */}
          <CommandSurfaceProvider key={generation} id="modal" role="modal" initialMode="cursor">
            <SurfaceContent />
          </CommandSurfaceProvider>
        </box>
      );
    };

    testSetup = await testRender(
      <CommandProvider>
        <Harness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await press(testSetup, "g");
    expect(testSetup.captureCharFrame()).toContain("pending:1");

    // Replace the surface with a same-id successor (a keypress would clear the
    // chord itself, so drive the swap directly).
    await act(async () => {
      swap!();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("pending:0");

    // Completing the old chord on the new surface must not fire the command.
    await press(testSetup, "g");
    expect(fired).toBe(0);
    expect(testSetup.captureCharFrame()).toContain("pending:1");
  });
});

describe("reactive registry", () => {
  test("useCommandContext().commands updates when a sibling registers post-mount", async () => {
    const LateRegistrant = function LateRegistrant() {
      useCommand({ handler: () => {}, hotkey: "l", id: "late", title: "Late" });
      return null;
    };

    const CommandCount = function CommandCount(): ReactNode {
      const { commands } = useCommandContext();
      return <text content={`count:${commands.length}`} />;
    };

    const Harness = function Harness(): ReactNode {
      const [showLate, setShowLate] = useState(false);
      useCommand({
        handler: () => {
          setShowLate(true);
        },
        hotkey: "o",
        id: "root.show",
        title: "Show late",
      });
      return (
        <box flexDirection="column">
          <CommandCount />
          {showLate && <LateRegistrant />}
        </box>
      );
    };

    testSetup = await testRender(
      <CommandProvider>
        <Harness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    expect(testSetup.captureCharFrame()).toContain("count:1");
    await press(testSetup, "o");
    // CommandCount re-rendered from the store subscription alone.
    expect(testSetup.captureCharFrame()).toContain("count:2");
  });
});

describe("F-13: surface command metadata", () => {
  const SurfaceContent = function SurfaceContent({
    children,
  }: {
    children?: ReactNode;
  }): ReactNode {
    useCommand({ handler: () => {}, hotkey: "1", id: "s.one", title: "One" });
    return (
      <box flexDirection="column">
        <text content="surface" />
        {children}
      </box>
    );
  };

  const ExtraCommand = function ExtraCommand() {
    useCommand({ handler: () => {}, hotkey: "2", id: "s.two", title: "Two" });
    return null;
  };

  test("useActiveCommandSurface().commands lists the modal surface's commands reactively", async () => {
    const ActiveProbe = function ActiveProbe(): ReactNode {
      const active = useActiveCommandSurface();
      const ids = active
        ? active.commands
            .map((c) => c.id)
            .sort()
            .join(",")
        : "none";
      return <text content={`active-commands:[${ids}]`} />;
    };

    const Harness = function Harness(): ReactNode {
      const [showExtra, setShowExtra] = useState(false);
      useCommand({ handler: () => {}, hotkey: "a", id: "root.a", title: "Root A" });
      return (
        <box flexDirection="column">
          <ActiveProbe />
          <CommandSurfaceProvider id="modal" role="modal" initialMode="cursor">
            <SurfaceContent>{showExtra && <ExtraCommand />}</SurfaceContent>
            <ExtraToggle
              onToggle={() => {
                setShowExtra(true);
              }}
            />
          </CommandSurfaceProvider>
        </box>
      );
    };

    const ExtraToggle = function ExtraToggle({ onToggle }: { onToggle: () => void }) {
      useCommand({ handler: onToggle, hotkey: "m", id: "s.more", title: "More" });
      return null;
    };

    testSetup = await testRender(
      <CommandProvider>
        <Harness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    expect(testSetup.captureCharFrame()).toContain("active-commands:[s.more,s.one]");

    // Registration on the active surface updates the metadata reactively.
    await press(testSetup, "m");
    expect(testSetup.captureCharFrame()).toContain("active-commands:[s.more,s.one,s.two]");
  });

  test("useSurfaceCommands defaults to the active surface and falls back to root", async () => {
    const SurfaceCommandsProbe = function SurfaceCommandsProbe(): ReactNode {
      const commands = useSurfaceCommands();
      const ids = commands
        .map((c) => c.id)
        .sort()
        .join(",");
      return <text content={`surface-commands:[${ids}]`} />;
    };

    const Harness = function Harness(): ReactNode {
      const [showSurface, setShowSurface] = useState(false);
      useCommand({
        handler: () => {
          setShowSurface(true);
        },
        hotkey: "o",
        id: "root.open",
        title: "Open",
      });
      return (
        <box flexDirection="column">
          <SurfaceCommandsProbe />
          {showSurface && (
            <CommandSurfaceProvider id="modal" role="modal" initialMode="cursor">
              <SurfaceContent />
            </CommandSurfaceProvider>
          )}
        </box>
      );
    };

    testSetup = await testRender(
      <CommandProvider>
        <Harness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 80 },
    );
    await testSetup.renderOnce();

    // No active surface: falls back to the root surface's commands.
    expect(testSetup.captureCharFrame()).toContain("surface-commands:[root.open]");

    await press(testSetup, "o");
    expect(testSetup.captureCharFrame()).toContain("surface-commands:[s.one]");
  });
});
