import { test, expect, afterEach, describe } from "bun:test";

import { testRender } from "@tooee/test-support";
import { act, useState } from "react";
import type { ReactNode } from "react";

import { CommandProvider, useActions, useCommand } from "../src/index.js";
import type { Mode } from "../src/index.js";

const ModesReregistrationHarness = function ModesReregistrationHarness(): ReactNode {
  const [modes, setModes] = useState<Mode[]>(["cursor"]);
  const [count, setCount] = useState(0);
  useActions([
    {
      handler: () => {
        setCount((n) => n + 1);
      },
      hotkey: "x",
      id: "act",
      modes,
      title: "Action",
    },
  ]);
  useCommand({
    handler: () => {
      setModes(["insert"]);
    },
    hotkey: "s",
    id: "swap-modes",
    title: "Swap modes",
  });

  return <text content={`count:${count}`} />;
};

const WhenReregistrationHarness = function WhenReregistrationHarness(): ReactNode {
  const [restricted, setRestricted] = useState(false);
  const [count, setCount] = useState(0);
  useActions([
    {
      handler: () => {
        setCount((n) => n + 1);
      },
      hotkey: "x",
      id: "act",
      title: "Action",
      when: restricted ? () => false : undefined,
    },
  ]);
  useCommand({
    handler: () => {
      setRestricted(true);
    },
    hotkey: "s",
    id: "restrict",
    title: "Restrict",
  });

  return <text content={`count:${count}`} />;
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

describe("useActions re-registration key (R-07)", () => {
  test("changing an action's modes re-registers the command", async () => {
    testSetup = await testRender(
      <CommandProvider>
        <ModesReregistrationHarness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 }
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
    testSetup = await testRender(
      <CommandProvider>
        <WhenReregistrationHarness />
      </CommandProvider>,
      { height: 10, kittyKeyboard: true, width: 60 }
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

const ExitHarness = function ExitHarness(): ReactNode {
  useActions([
    {
      handler: (ctx) => {
        ctx.exit();
      },
      hotkey: "x",
      id: "leave",
      title: "Leave",
    },
  ]);

  return <text content="exit harness" />;
};

describe("ctx.exit", () => {
  test("destroys the renderer when no context source supplies exit", async () => {
    testSetup = await testRender(
      <CommandProvider>
        <ExitHarness />
      </CommandProvider>,
      { height: 5, width: 40 }
    );
    await testSetup.renderOnce();
    expect(testSetup.renderer.isDestroyed).toBe(false);

    await act(async () => {
      testSetup.mockInput.pressKey("x");
      await Promise.resolve();
    });

    expect(testSetup.renderer.isDestroyed).toBe(true);
  });
});

const PlusHarness = function PlusHarness(): ReactNode {
  const [count, setCount] = useState(0);
  useCommand({
    handler: () => {
      setCount((n) => n + 1);
    },
    hotkey: "+",
    id: "grow",
    title: "Grow",
  });

  return <text content={`count:${count}`} />;
};

describe("plus hotkey", () => {
  test("a + keypress runs a command bound to +", async () => {
    testSetup = await testRender(
      <CommandProvider>
        <PlusHarness />
      </CommandProvider>,
      { height: 5, kittyKeyboard: true, width: 40 }
    );
    await testSetup.renderOnce();

    await press(testSetup, "+");

    expect(testSetup.captureCharFrame()).toContain("count:1");
  });
});
