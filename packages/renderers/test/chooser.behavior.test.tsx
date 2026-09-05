import { afterEach, describe, expect, test } from "bun:test";
import { act } from "react";
import type { ReactNode } from "react";
import { CommandProvider } from "@tooee/commands";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { testRender } from "@tooee/test-support";
import { Chooser } from "../src/chooser/chooser.js";

const ITEMS = [{ text: "alpha" }, { text: "beta" }, { text: "gamma" }];
const noop = (): void => {};

const Harness = function Harness({
  onSelect,
  onCancel = noop,
  onActiveChange = noop,
}: {
  onSelect: (text: string) => void;
  onCancel?: () => void;
  onActiveChange?: (text: string | undefined) => void;
}): ReactNode {
  return (
    <CommandProvider initialMode="insert">
      <ThemeSwitcherProvider>
        <Chooser
          items={ITEMS}
          commandScope="test-chooser"
          prompt="? "
          onActiveChange={(item) => {
            onActiveChange(item?.text);
          }}
          onCancel={onCancel}
          onSelect={(item): void => {
            onSelect(item.text);
          }}
        />
      </ThemeSwitcherProvider>
    </CommandProvider>
  );
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("Chooser", () => {
  test("owns filtering, active-row preview, movement, and keyboard selection", async () => {
    const active: (string | undefined)[] = [];
    const selected: string[] = [];
    testSetup = await testRender(
      <Harness
        onActiveChange={(text) => {
          active.push(text);
        }}
        onSelect={(text) => {
          selected.push(text);
        }}
      />,
      { height: 20, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockInput.typeText("be");
      testSetup.mockInput.pressArrow("down");
      testSetup.mockInput.pressEnter();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(active).toContain("beta");
    expect(selected).toEqual(["beta"]);
  });

  test("owns modal Escape cancellation", async () => {
    let cancellations = 0;
    testSetup = await testRender(
      <Harness
        onCancel={() => {
          cancellations += 1;
        }}
        onSelect={() => {}}
      />,
      { height: 20, kittyKeyboard: true, width: 60 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      testSetup.mockInput.pressEscape();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(cancellations).toBe(1);
  });
});
