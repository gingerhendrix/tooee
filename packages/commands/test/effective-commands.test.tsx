import { testRender } from "../../../test/support/test-render.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, useEffect } from "react";
import type { ReactNode } from "react";
import {
  CommandProvider,
  CommandSurfaceProvider,
  useCommand,
  useCommandStore,
  useEffectiveCommands,
} from "../src/index.js";

type TestSession = Awaited<ReturnType<typeof testRender>>;

let invokeEffective: ((id: string) => void) | null = null;
let fired: string[] = [];

const Probe = function Probe(): ReactNode {
  const { commands, invoke } = useEffectiveCommands();
  invokeEffective = invoke;
  const summary = commands
    .map((command) => `${command.id}:${command.defaultHotkey ?? "-"}`)
    .join(",");
  return <text content={`eff=${summary}`} />;
};

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

const RootCommands = function RootCommands(): ReactNode {
  useCommand({
    handler: () => {
      fired.push("root.global");
    },
    hotkey: "g",
    id: "root.global",
    modes: ["cursor"],
    title: "Root Global",
  });
  useCommand({
    handler: () => {
      fired.push("root.jump");
    },
    hotkey: "j",
    id: "root.jump",
    modes: ["cursor"],
    title: "Root Jump",
  });
  return null;
};

const PanelACommands = function PanelACommands(): ReactNode {
  useCommand({
    handler: () => {
      fired.push("a.list");
    },
    // Shadows the root's "j".
    hotkey: "j",
    id: "a.list",
    modes: ["cursor"],
    title: "Panel A List",
  });
  useCommand({
    handler: () => {
      fired.push("a.only");
    },
    hotkey: "k",
    id: "a.only",
    modes: ["cursor"],
    title: "Panel A Only",
  });
  return null;
};

const PanelBCommands = function PanelBCommands(): ReactNode {
  useCommand({
    handler: () => {
      fired.push("b.only");
    },
    hotkey: "l",
    id: "b.only",
    modes: ["cursor"],
    title: "Panel B Only",
  });
  return null;
};

const Harness = function Harness({ active }: { active: string }): ReactNode {
  return (
    <CommandProvider>
      <RootCommands />
      <Probe />
      <CommandSurfaceProvider id="a" role="panel" groupId="g">
        <PanelACommands />
      </CommandSurfaceProvider>
      <CommandSurfaceProvider id="b" role="panel" groupId="g">
        <PanelBCommands />
      </CommandSurfaceProvider>
      <Activate groupId="g" panelId={active} />
    </CommandProvider>
  );
};

let session: TestSession | undefined;

const frame = function frame(): string {
  return session ? session.captureCharFrame() : "";
};

beforeEach(() => {
  invokeEffective = null;
  fired = [];
});

afterEach(() => {
  session?.renderer.destroy();
  session = undefined;
});

describe("useEffectiveCommands", () => {
  test("with no active panel it is exactly the root command set", async () => {
    session = await testRender(
      <CommandProvider>
        <RootCommands />
        <Probe />
      </CommandProvider>,
      { height: 8, kittyKeyboard: true, width: 120 },
    );
    await session.renderOnce();
    const text = frame();
    expect(text).toContain("root.global:g");
    expect(text).toContain("root.jump:j");
    expect(text).not.toContain("a.list");
  });

  test("with a panel active it lists panel + root commands, shadows root hotkeys, excludes inactive panels", async () => {
    session = await testRender(<Harness active="a" />, {
      height: 8,
      kittyKeyboard: true,
      width: 120,
    });
    await session.renderOnce();
    const text = frame();

    // Active panel A commands present, keeping their own hotkeys.
    expect(text).toContain("a.list:j");
    expect(text).toContain("a.only:k");
    // Root commands present; the one shadowed by a panel hotkey drops its hint.
    expect(text).toContain("root.global:g");
    expect(text).toContain("root.jump:-");
    // Inactive panel B commands are absent.
    expect(text).not.toContain("b.only");
  });

  test("invoke routes to the owning surface (panel, else root)", async () => {
    session = await testRender(<Harness active="a" />, {
      height: 8,
      kittyKeyboard: true,
      width: 120,
    });
    await session.renderOnce();

    act(() => {
      invokeEffective?.("a.list");
      invokeEffective?.("root.global");
      // An inactive panel's command is not in the effective set: routed to root,
      // which has no such id, so nothing fires.
      invokeEffective?.("b.only");
    });
    expect(fired).toEqual(["a.list", "root.global"]);
  });

  test("switching the active panel re-derives the effective set", async () => {
    session = await testRender(<Harness active="b" />, {
      height: 8,
      kittyKeyboard: true,
      width: 120,
    });
    await session.renderOnce();
    const text = frame();
    expect(text).toContain("b.only:l");
    expect(text).not.toContain("a.list");
    expect(text).toContain("root.global:g");
    // A's "j" is no longer active, so root.jump keeps its hint.
    expect(text).toContain("root.jump:j");
  });
});
