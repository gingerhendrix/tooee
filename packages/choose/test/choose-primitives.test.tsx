import { afterEach, describe, expect, test } from "bun:test";
import { act, useState } from "react";
import { CommandSurfaceProvider, useCommand } from "@tooee/commands";
import { TooeeProvider } from "@tooee/shell";
import { testRender } from "../../../test/support/test-render.ts";
import { Choose } from "../src/choose.js";
import { ChooseOverlay } from "../src/choose-overlay.js";
import { buildChooseHints } from "../src/choose-panel.js";
import type { ChooseContentProvider, ChooseItem, ChooseSource } from "../src/types.js";
import type { ChooseController } from "../src/use-choose.js";
import { expectDefined } from "./support/expect-defined.ts";

const ChildSurface = function ChildSurface({ close }: { close: () => void }): React.ReactNode {
  useCommand({
    handler: close,
    hotkey: "x",
    id: "child:close",
    modes: ["cursor"],
    title: "Close child",
  });
  return (
    <box position="absolute" left="30%" right="30%" top="40%" bottom="40%" border>
      <text content="CHILD PICKER" />
    </box>
  );
};

const NestedHost = function NestedHost({
  onSelect,
}: {
  onSelect: (item: ChooseItem) => void;
}): React.ReactNode {
  const [open, setOpen] = useState(true);
  return (
    <ChooseOverlay
      items={[{ text: "alpha" }, { text: "beta" }]}
      onSelect={onSelect}
      onCancel={() => {}}
    >
      {open && (
        <CommandSurfaceProvider {...{ role: "modal" }} id="choose-test.child" initialMode="cursor">
          <ChildSurface
            close={() => {
              setOpen(false);
            }}
          />
        </CommandSurfaceProvider>
      )}
    </ChooseOverlay>
  );
};

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const deferred = function deferred<T>() {
  return Promise.withResolvers<T>();
};

const setup = async function setup(node: React.ReactNode) {
  const session = await testRender(<TooeeProvider initialMode="insert">{node}</TooeeProvider>, {
    height: 24,
    kittyKeyboard: true,
    width: 80,
  });
  await session.renderOnce();
  return session;
};

const press = async function press(key: string, modifiers?: { ctrl?: boolean; shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressKey(key, modifiers);
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const pressArrow = async function pressArrow(direction: "up" | "down") {
  await act(async () => {
    testSetup.mockInput.pressArrow(direction);
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const pressEnter = async function pressEnter() {
  await act(async () => {
    testSetup.mockInput.pressEnter();
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const pressTab = async function pressTab(modifiers?: { shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressTab(modifiers);
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const pressEscape = async function pressEscape() {
  await act(async () => {
    testSetup.mockInput.pressEscape();
    await Promise.resolve();
  });
  await testSetup.renderOnce();
};

const typeText = async function typeText(text: string) {
  await act(async () => {
    await testSetup.mockInput.typeText(text);
  });
  await testSetup.renderOnce();
};

describe("ChooseController and normalized sources", () => {
  test("controls filter, active item, multi-selection, and same-tick submission", async () => {
    const controllerRef = { current: null as ChooseController | null };
    let submitted: ChooseItem[] = [];
    testSetup = await setup(
      <ChooseOverlay
        items={[{ text: "alpha" }, { text: "beta" }, { text: "gamma" }]}
        multi
        controllerRef={controllerRef}
        onSubmit={(result) => {
          submitted = result.items;
        }}
        onCancel={() => {}}
      />,
    );

    await act(async () => {
      expectDefined(controllerRef.current).setFilter("a");
      expectDefined(controllerRef.current).setActiveIndex(1);
      expectDefined(controllerRef.current).toggleActive();
      expectDefined(controllerRef.current).moveDown();
      expectDefined(controllerRef.current).toggleActive();
      expectDefined(controllerRef.current).submit();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    expect(expectDefined(controllerRef.current).getFilter()).toBe("a");
    expect(expectDefined(controllerRef.current).getActiveItem()?.text).toBe("gamma");
    expect(
      expectDefined(controllerRef.current)
        .getSelectedItems()
        .map((item) => item.text),
    ).toEqual(["beta", "gamma"]);
    expect(submitted.map((item) => item.text)).toEqual(["beta", "gamma"]);
  });

  test("accepts a synchronous loader and reloads it through the controller", async () => {
    const controllerRef = { current: null as ChooseController | null };
    let revision = 0;
    const source = () => {
      revision += 1;
      return [{ text: `item-${revision}` }];
    };

    testSetup = await setup(
      <ChooseOverlay
        items={source}
        controllerRef={controllerRef}
        onSelect={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(testSetup.captureCharFrame()).toContain("item-1");

    await act(async () => {
      expectDefined(controllerRef.current).reload();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("item-2");
  });

  test("reflects direct-array replacement and resets active selection", async () => {
    const controllerRef = { current: null as ChooseController | null };
    let replace!: () => void;

    const Host = function Host(): React.ReactNode {
      const [items, setItems] = useState<ChooseItem[]>([{ text: "old-one" }, { text: "old-two" }]);
      replace = () => {
        setItems([{ text: "fresh-one" }]);
      };
      return (
        <ChooseOverlay
          items={items}
          controllerRef={controllerRef}
          onSelect={() => {}}
          onCancel={() => {}}
        />
      );
    };

    testSetup = await setup(<Host />);
    await act(async () => {
      expectDefined(controllerRef.current).setActiveIndex(1);
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    await act(async () => {
      replace();
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("fresh-one");
    expect(frame).not.toContain("old-one");
    expect(expectDefined(controllerRef.current).getActiveItem()?.text).toBe("fresh-one");
  });

  test("ignores a stale loader completion after source replacement", async () => {
    const slow = deferred<ChooseItem[]>();
    let replace!: () => void;

    const Host = function Host(): React.ReactNode {
      const [source, setSource] = useState<ChooseSource>(() => async () => {
        const items = await slow.promise;
        return items;
      });
      replace = () => {
        setSource([{ text: "fresh" }]);
      };
      return <ChooseOverlay items={source} onSelect={() => {}} onCancel={() => {}} />;
    };

    testSetup = await setup(<Host />);
    await act(async () => {
      replace();
      await Promise.resolve();
    });
    await testSetup.renderOnce();
    await act(async () => {
      slow.resolve([{ text: "stale" }]);
      await Promise.resolve();
    });
    await testSetup.renderOnce();

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("fresh");
    expect(frame).not.toContain("stale");
  });
});

describe("shared commands, context, and surfaces", () => {
  test("filters in insert mode and submits the first fuzzy match", async () => {
    const selected: ChooseItem[] = [];
    testSetup = await setup(
      <ChooseOverlay
        items={[{ text: "alpha" }, { text: "beta" }, { text: "gamma" }]}
        onSelect={(item) => {
          selected.push(item);
        }}
        onCancel={() => {}}
      />,
    );

    await typeText("ga");
    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("gamma");
    expect(frame).not.toContain("alpha");
    await pressEnter();
    expect(selected[0]?.text).toBe("gamma");
  });

  test("Escape enters cursor mode, i returns to insert, and cursor q cancels", async () => {
    const controllerRef = { current: null as ChooseController | null };
    let cancellations = 0;
    testSetup = await setup(
      <ChooseOverlay
        items={[{ text: "alpha" }]}
        controllerRef={controllerRef}
        onSelect={() => {}}
        onCancel={() => {
          cancellations += 1;
        }}
      />,
    );

    await pressEscape();
    expect(expectDefined(controllerRef.current).mode).toBe("cursor");
    expect(cancellations).toBe(0);
    await press("i");
    expect(expectDefined(controllerRef.current).mode).toBe("insert");
    await pressEscape();
    await press("q");
    expect(cancellations).toBe(1);
  });

  test("Tab and Shift+Tab toggle multi-selection while moving", async () => {
    let submitted: ChooseItem[] = [];
    testSetup = await setup(
      <ChooseOverlay
        items={[{ text: "alpha" }, { text: "beta" }, { text: "gamma" }]}
        multi
        onSubmit={(result) => {
          submitted = result.items;
        }}
        onCancel={() => {}}
      />,
    );

    await pressTab();
    await pressTab({ shift: true });
    await pressTab();
    await pressEnter();

    // alpha on → beta on/back → alpha off/forward leaves beta selected.
    expect(submitted.map((item) => item.text)).toEqual(["beta"]);
  });

  test("consumer commands receive the live choose context", async () => {
    let contextItem = "";
    let contextFilter = "";
    testSetup = await setup(
      <ChooseOverlay
        items={[{ text: "alpha" }, { text: "beta" }]}
        onSelect={() => {}}
        onCancel={() => {}}
        commands={[
          {
            handler: (context) => {
              contextItem = context.choose.activeItem?.text ?? "";
              contextFilter = context.choose.filterQuery;
            },
            hotkey: "x",
            id: "inspect-choose",
            modes: ["cursor"],
            title: "Inspect chooser",
          },
        ]}
      />,
    );

    await pressArrow("down");
    await pressEscape();
    await press("x");
    expect(contextItem).toBe("beta");
    expect(contextFilter).toBe("");
  });

  test("a nested modal surface suspends navigation, submission, and filter focus", async () => {
    const selected: ChooseItem[] = [];
    testSetup = await setup(
      <NestedHost
        onSelect={(item) => {
          selected.push(item);
        }}
      />,
    );

    expect(testSetup.captureCharFrame()).toContain("CHILD PICKER");
    expect(testSetup.renderer.getCursorState().visible).toBe(false);
    await pressArrow("down");
    await pressEnter();
    expect(selected).toEqual([]);

    await press("x");
    expect(testSetup.captureCharFrame()).not.toContain("CHILD PICKER");
    expect(testSetup.renderer.getCursorState().visible).toBe(true);

    await pressArrow("down");
    await pressEnter();
    expect(selected[0]?.text).toBe("beta");
  });

  test("fullscreen submit actions retain precedence over onConfirm", async () => {
    const provider: ChooseContentProvider = { load: () => [{ text: "alpha" }] };
    let actionItem = "";
    let confirms = 0;
    const callbacks: { onConfirm: () => void } = {
      onConfirm: () => {
        confirms += 1;
      },
    };
    testSetup = await setup(
      <Choose
        contentProvider={provider}
        actions={[
          {
            handler: (context) => {
              actionItem = context.choose.activeItem?.text ?? "";
            },
            id: "submit",
            title: "Submit",
          },
        ]}
        {...callbacks}
      />,
    );

    await pressEnter();
    expect(actionItem).toBe("alpha");
    expect(confirms).toBe(0);
  });
});

describe("view extension points", () => {
  test("renders custom hints, status, footer, and rows from shared context", async () => {
    testSetup = await setup(
      <ChooseOverlay
        items={[{ text: "alpha" }]}
        prompt="Pick"
        onSelect={() => {}}
        onCancel={() => {}}
        hints={() => "x extra"}
        statusRight="READY"
        footer={<text content="FOOTER" />}
        renderItem={({ item, defaultContent }): React.ReactNode => (
          <>
            <text content={`CUSTOM:${item.text} `} />
            {defaultContent}
          </>
        )}
      />,
    );

    const frame = testSetup.captureCharFrame();
    expect(frame).toContain("Pick");
    expect(frame).toContain("CUSTOM:alpha");
    expect(frame).toContain("FOOTER");
    expect(frame).toContain("x extra");
    expect(frame).toContain("READY");
  });

  test("buildChooseHints includes multi-selection and extra entries", () => {
    expect(buildChooseHints("insert", { multi: true })).toEqual([
      "↑↓ navigate",
      "Enter confirm",
      "Tab toggle",
      "Esc commands",
    ]);
    expect(buildChooseHints("cursor", { extra: ["x extra"] }).at(-1)).toBe("x extra");
  });
});
