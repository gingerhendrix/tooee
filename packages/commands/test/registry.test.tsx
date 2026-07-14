import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import { CommandProvider, useCommand, useCommandGroup, useCommandRegistry } from "../src/index.js";
import type { RegisteredCommandGroup } from "../src/index.js";
import { expectDefined } from "./support/expect-defined.ts";

const CommandRegistrant = function CommandRegistrant({ onFire }: { onFire: () => void }) {
  useCommand({ handler: onFire, hotkey: "d", id: "dup", title: "Dup" });
  return null;
};

const CommandIdentityHarness = function CommandIdentityHarness(): React.ReactNode {
  const [showFirst, setShowFirst] = useState(true);
  const [firstCount, setFirstCount] = useState(0);
  const [secondCount, setSecondCount] = useState(0);
  useCommand({
    handler: () => {
      setShowFirst(false);
    },
    hotkey: "h",
    id: "root.hide-first",
    title: "Hide first",
  });
  return (
    <box flexDirection="column">
      <text content={`first:${firstCount}`} />
      <text content={`second:${secondCount}`} />
      {showFirst && (
        <CommandRegistrant
          onFire={() => {
            setFirstCount((n) => n + 1);
          }}
        />
      )}
      <CommandRegistrant
        onFire={() => {
          setSecondCount((n) => n + 1);
        }}
      />
    </box>
  );
};

const GroupRegistrant = function GroupRegistrant({ title }: { title: string }) {
  useCommandGroup({ id: `group-${title}`, prefix: "g", title });
  return null;
};

const GroupIdentityHarness = function GroupIdentityHarness({
  ProbeComponent,
}: {
  ProbeComponent: () => React.ReactNode;
}): React.ReactNode {
  const [showFirst, setShowFirst] = useState(true);
  useCommand({
    handler: () => {
      setShowFirst(false);
    },
    hotkey: "h",
    id: "root.hide-first",
    title: "Hide first",
  });
  return (
    <box>
      <ProbeComponent />
      {showFirst && <GroupRegistrant title="First group" />}
      <GroupRegistrant title="Second group" />
    </box>
  );
};

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

describe("registry unregister guards (R-05)", () => {
  test("first registrant's unmount does not delete the second's live command", async () => {
    testSetup = await testRender(
      <CommandProvider>
        <CommandIdentityHarness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // The second registrant won the id; it handles the hotkey.
    await press(testSetup, "d");
    let frame = testSetup.captureCharFrame();
    expect(frame).toContain("second:1");
    expect(frame).toContain("first:0");

    // Unmounting the first registrant must not delete the second's command.
    await press(testSetup, "h");
    await press(testSetup, "d");
    frame = testSetup.captureCharFrame();
    expect(frame).toContain("second:2");
  });

  test("first group registrant's unmount does not delete the second's live group", async () => {
    // Captured through an explicitly typed object rather than a `let` that
    // control-flow analysis narrows to its initial `null` value inside the probe
    // component (which made every later read error-typed).
    const observed: { groups?: ReadonlyMap<string, RegisteredCommandGroup> } = {};
    const currentGroups = (): ReadonlyMap<string, RegisteredCommandGroup> =>
      expectDefined(observed.groups);

    const Probe = function Probe() {
      const { groups } = useCommandRegistry();
      observed.groups = groups;
      return null;
    };

    testSetup = await testRender(
      <CommandProvider>
        <GroupIdentityHarness ProbeComponent={Probe} />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    const group = currentGroups().get("g");
    expect(group?.title).toBe("Second group");

    await press(testSetup, "h");
    const groupAfterKeypress = currentGroups().get("g");
    expect(groupAfterKeypress?.title).toBe("Second group");
  });
});
