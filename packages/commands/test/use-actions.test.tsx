import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import { CommandProvider, useActions, useCommand } from "../src/index.js";
import type { Mode } from "../src/index.js";

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const press = async function press(session: TestSession, key: string) {
  await act(async () => {
    session.mockInput.pressKey(key);
  });
  await session.renderOnce();
};

describe("useActions re-registration key (R-07)", () => {
  test("changing an action's modes re-registers the command", async () => {
    const Harness = function Harness(): React.ReactNode {
      const [modes, setModes] = useState<Mode[]>(["cursor"]);
      const [count, setCount] = useState(0);
      useActions([
        {
          handler: () => setCount((n) => n + 1),
          hotkey: "x",
          id: "act",
          modes,
          title: "Action",
        },
      ]);
      useCommand({
        handler: () => setModes(["insert"]),
        hotkey: "s",
        id: "swap-modes",
        title: "Swap modes",
      });
      return <text content={`count:${count}`} />;
    };

    testSetup = await testRender(
      <CommandProvider>
        <Harness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    // In cursor mode (the default), the action fires.
    await press(testSetup, "x");
    expect(testSetup.captureCharFrame()).toContain("count:1");

    // Restrict the action to insert mode: it must re-register and stop
    // firing in cursor mode.
    await press(testSetup, "s");
    await press(testSetup, "x");
    expect(testSetup.captureCharFrame()).toContain("count:1");
  });

  test("adding a when clause after mount re-registers the command", async () => {
    const Harness = function Harness(): React.ReactNode {
      const [restricted, setRestricted] = useState(false);
      const [count, setCount] = useState(0);
      useActions([
        {
          handler: () => setCount((n) => n + 1),
          hotkey: "x",
          id: "act",
          title: "Action",
          when: restricted ? () => false : undefined,
        },
      ]);
      useCommand({
        handler: () => setRestricted(true),
        hotkey: "s",
        id: "restrict",
        title: "Restrict",
      });
      return <text content={`count:${count}`} />;
    };

    testSetup = await testRender(
      <CommandProvider>
        <Harness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await press(testSetup, "x");
    expect(testSetup.captureCharFrame()).toContain("count:1");

    // The added when() => false must take effect.
    await press(testSetup, "s");
    await press(testSetup, "x");
    expect(testSetup.captureCharFrame()).toContain("count:1");
  });
});
