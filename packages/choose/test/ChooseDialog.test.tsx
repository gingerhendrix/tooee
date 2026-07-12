import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act } from "react";
import { useRef, useState } from "react";
import { TooeeProvider } from "@tooee/shell";
import { useCurrentOverlay, useOverlayState } from "@tooee/overlays";
import { testRender } from "../../../test/support/test-render.ts";
import type { ChooseItem } from "../src/types.js";
import { useChooseDialog } from "../src/use-choose-dialog.js";
import type { ChooseDialogHandle } from "../src/use-choose-dialog.js";

interface Fruit {
  id: number;
  name: string;
}

const FRUITS: Fruit[] = [
  { id: 1, name: "apple" },
  { id: 2, name: "banana" },
  { id: 3, name: "cherry" },
];

type TestSession = Awaited<ReturnType<typeof testRender>>;

let testSetup: TestSession;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const press = async function press(key: string, modifiers?: { ctrl?: boolean; shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressKey(key, modifiers);
  });
  await testSetup.renderOnce();
};

const pressEscape = async function pressEscape() {
  await act(async () => {
    testSetup.mockInput.pressEscape();
  });
  await testSetup.renderOnce();
};

const pressEnter = async function pressEnter() {
  await act(async () => {
    testSetup.mockInput.pressEnter();
  });
  await testSetup.renderOnce();
};

const pressTab = async function pressTab() {
  await act(async () => {
    testSetup.mockInput.pressTab();
  });
  await testSetup.renderOnce();
};

const typeText = async function typeText(text: string) {
  await act(async () => {
    await testSetup.mockInput.typeText(text);
  });
  await testSetup.renderOnce();
};

interface HarnessHandles {
  fruits: ChooseDialogHandle<Fruit>;
  rows: ChooseDialogHandle<ChooseItem>;
  unmountOwner: () => void;
  ownerFruits: ChooseDialogHandle<Fruit> | null;
  stackSize: () => number;
}

const handles: { current: HarnessHandles | null } = { current: null };
let settlements: unknown[] = [];

beforeEach(() => {
  handles.current = null;
  settlements = [];
});

const DialogOwner = function DialogOwner({
  openRef,
}: {
  openRef: { current: ChooseDialogHandle<Fruit> | null };
}) {
  const dialog = useChooseDialog<Fruit>();
  openRef.current = dialog;
  return null;
};

const Harness = function Harness() {
  const overlayState = useOverlayState();
  const current = useCurrentOverlay();
  const fruits = useChooseDialog<Fruit>();
  const rows = useChooseDialog<ChooseItem>();
  const [ownerMounted, setOwnerMounted] = useState(true);
  const ownerRef = useRef<ChooseDialogHandle<Fruit> | null>(null);
  const stateRef = useRef(overlayState);
  stateRef.current = overlayState;

  handles.current = {
    fruits,
    get ownerFruits() {
      return ownerRef.current;
    },
    rows,
    stackSize: () => stateRef.current.stack.length,
    unmountOwner: () => setOwnerMounted(false),
  };

  return (
    <box flexDirection="column">
      <text content={`stack:${overlayState.stack.length}`} />
      {ownerMounted && <DialogOwner openRef={ownerRef} />}
      {current}
    </box>
  );
};

const setup = async function setup() {
  const session = await testRender(
    <TooeeProvider>
      <Harness />
    </TooeeProvider>,
    { height: 30, kittyKeyboard: true, width: 80 },
  );
  await session.renderOnce();
  return session;
};

const toItem = (fruit: Fruit): ChooseItem => ({ text: fruit.name });

describe("useChooseDialog", () => {
  test("single select resolves the typed item without casts", async () => {
    testSetup = await setup();
    await act(async () => {
      void handles
        .current!.fruits.open({ items: FRUITS, prompt: "Pick fruit", toItem })
        .then((fruit) => {
          // Compile-time: `fruit` is Fruit | null (no cast needed for .id).
          settlements.push(fruit === null ? null : fruit.id);
        });
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Pick fruit");

    await pressEnter(); // confirm the first (active) item

    expect(settlements).toEqual([1]);
    expect(handles.current!.stackSize()).toBe(0);
  });

  test("navigation + Enter resolves the highlighted typed item", async () => {
    testSetup = await setup();
    await act(async () => {
      void handles
        .current!.fruits.open({ items: FRUITS, prompt: "Pick fruit", toItem })
        .then((fruit) => settlements.push(fruit === null ? null : fruit.id));
    });
    await testSetup.renderOnce();

    await press("n", { ctrl: true }); // move down to banana
    await pressEnter();

    expect(settlements).toEqual([2]);
  });

  test("filtering resolves the matching typed item", async () => {
    testSetup = await setup();
    await act(async () => {
      void handles
        .current!.fruits.open({ items: FRUITS, prompt: "Pick fruit", toItem })
        .then((fruit) => settlements.push(fruit === null ? null : fruit.name));
    });
    await testSetup.renderOnce();

    await typeText("cher");
    await pressEnter();

    expect(settlements).toEqual(["cherry"]);
  });

  test("multi select resolves the toggled typed items", async () => {
    testSetup = await setup();
    await act(async () => {
      void handles
        .current!.fruits.open({ items: FRUITS, multi: true, prompt: "Pick fruits", toItem })
        .then((fruits) => {
          // Compile-time: `fruits` is Fruit[] | null.
          settlements.push(fruits === null ? null : fruits.map((fruit) => fruit.id));
        });
    });
    await testSetup.renderOnce();

    await pressTab(); // toggle apple, move to banana
    await pressTab(); // toggle banana, move to cherry
    await pressEnter();

    expect(settlements).toEqual([[1, 2]]);
    expect(handles.current!.stackSize()).toBe(0);
  });

  test("cancel resolves null exactly once", async () => {
    testSetup = await setup();
    await act(async () => {
      void handles
        .current!.fruits.open({ items: FRUITS, prompt: "Pick fruit", toItem })
        .then((fruit) => settlements.push(fruit));
    });
    await testSetup.renderOnce();

    await pressEscape(); // insert -> cursor
    await pressEscape(); // cursor -> cancel

    expect(settlements).toEqual([null]);
    expect(handles.current!.stackSize()).toBe(0);
  });

  test("async item loaders resolve typed items", async () => {
    testSetup = await setup();
    await act(async () => {
      void handles
        .current!.fruits.open({
          items: () => Promise.resolve(FRUITS),
          prompt: "Pick fruit",
          toItem,
        })
        .then((fruit) => settlements.push(fruit === null ? null : fruit.name));
    });
    await testSetup.renderOnce();
    await testSetup.renderOnce(); // flush the async load

    await typeText("ban");
    await pressEnter();

    expect(settlements).toEqual(["banana"]);
  });

  test("ChooseItem items work without toItem and resolve the original object", async () => {
    testSetup = await setup();
    const rows: ChooseItem[] = [{ text: "one" }, { text: "two" }];
    await act(async () => {
      void handles.current!.rows.open({ items: rows, prompt: "Pick row" }).then((row) => {
        settlements.push(row);
      });
    });
    await testSetup.renderOnce();

    await press("n", { ctrl: true });
    await pressEnter();

    // Identity: the resolved value is the caller's original object, not the
    // internally mapped display row.
    expect(settlements.length).toBe(1);
    expect(settlements[0]).toBe(rows[1]);
  });

  test("duplicate display texts still resolve distinct typed items", async () => {
    testSetup = await setup();
    const twins: Fruit[] = [
      { id: 10, name: "same" },
      { id: 20, name: "same" },
    ];
    await act(async () => {
      void handles
        .current!.fruits.open({ items: twins, prompt: "Pick twin", toItem })
        .then((fruit) => settlements.push(fruit === null ? null : fruit.id));
    });
    await testSetup.renderOnce();

    await press("n", { ctrl: true }); // highlight the second identical row
    await pressEnter();

    expect(settlements).toEqual([20]);
  });

  test("unmounting the owner settles null and later opens resolve null", async () => {
    testSetup = await setup();
    const ownerDialog = handles.current!.ownerFruits!;
    await act(async () => {
      void ownerDialog
        .open({ items: FRUITS, prompt: "Owned picker", toItem })
        .then((fruit) => settlements.push(fruit));
    });
    await testSetup.renderOnce();
    expect(testSetup.captureCharFrame()).toContain("Owned picker");

    await act(async () => {
      handles.current!.unmountOwner();
    });
    await testSetup.renderOnce();

    expect(settlements).toEqual([null]);
    expect(handles.current!.stackSize()).toBe(0);

    await act(async () => {
      void ownerDialog
        .open({ items: FRUITS, prompt: "Too late", toItem })
        .then((fruit) => settlements.push(fruit));
    });
    await testSetup.renderOnce();
    expect(settlements).toEqual([null, null]);
    expect(handles.current!.stackSize()).toBe(0);
  });
});
