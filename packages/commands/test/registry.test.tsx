import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import { CommandProvider, useCommand, useCommandGroup, useCommandRegistry } from "../src/index.js";
import type { RegisteredCommandGroup } from "../src/index.js";

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
    const Registrant = function Registrant({ onFire }: { onFire: () => void }) {
      useCommand({ handler: onFire, hotkey: "d", id: "dup", title: "Dup" });
      return null;
    };

    const Harness = function Harness(): React.ReactNode {
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
            <Registrant
              onFire={() => {
                setFirstCount((n) => n + 1);
              }}
            />
          )}
          <Registrant
            onFire={() => {
              setSecondCount((n) => n + 1);
            }}
          />
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
    let groups: Map<string, RegisteredCommandGroup> | null = null;

    const Probe = function Probe() {
      groups = useCommandRegistry().groups;
      return null;
    };

    const GroupRegistrant = function GroupRegistrant({ title }: { title: string }) {
      useCommandGroup({ id: `group-${title}`, prefix: "g", title });
      return null;
    };

    const Harness = function Harness(): React.ReactNode {
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
          <Probe />
          {showFirst && <GroupRegistrant title="First group" />}
          <GroupRegistrant title="Second group" />
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

    expect(groups!.get("g")?.title).toBe("Second group");

    await press(testSetup, "h");
    expect(groups!.get("g")?.title).toBe("Second group");
  });
});
