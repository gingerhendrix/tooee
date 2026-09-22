import { testRender, expectDefined, press, pressTab, pressEscape } from "@tooee/test-support";
import type { TestSession } from "@tooee/test-support";
import { test, expect, afterEach, describe } from "bun:test";
import { act, useState } from "react";
import { useMode } from "@tooee/commands";
import type { DecorationLayer } from "@tooee/renderers";
import {
  Document,
  DocumentDecorationPriorities,
  TooeeProvider,
  useDocumentController,
} from "@tooee/shell";
import type {
  DocumentController,
  DocumentSearchOptions,
  UseDocumentControllerOptions,
} from "@tooee/shell";
import type { ReactNode } from "react";

interface Row {
  id: string;
  label: string;
  selectable?: boolean;
}

const row = function row(id: string, label = id, selectable = true): Row {
  return { id, label, selectable };
};

const ADAPTER = {
  getKey: (r: Row) => r.id,
  getText: (r: Row) => r.label,
  isSelectable: (r: Row) => r.selectable !== false,
};

const THREE = [row("a"), row("b"), row("c")];

// Module-level handle for imperative access to controller state, matching the
// pattern in search.test.tsx.
let handle: DocumentController<Row> | null = null;

const controller = function controller(): DocumentController<Row> {
  if (!handle) {
    throw new Error("controller not mounted");
  }
  return handle;
};

/** Renders every layer as `priority@row+row` so decoration composition is observable. */
const describeLayers = function describeLayers(layers: readonly DecorationLayer[]): string {
  return layers
    .map(
      (layer) =>
        `${layer.priority}@${[...layer.forVisibleRows(0, 99)].map((d) => d.row).join("+")}`,
    )
    .join(" ");
};

type HarnessOptions = Omit<UseDocumentControllerOptions<Row>, "adapter" | "rows">;

const Harness = function Harness({
  rows,
  ...options
}: HarnessOptions & { rows: readonly Row[] }): ReactNode {
  const document = useDocumentController<Row>({ adapter: ADAPTER, rows, ...options });
  const mode = useMode();
  handle = document;

  return (
    <box flexDirection="column" height="100%">
      <text
        content={`mode:${mode} active:${document.activeKey ?? "-"}/${document.activeIndex ?? "-"}`}
        flexShrink={0}
      />
      <Document
        controller={document}
        showGutter={false}
        style={{ flexGrow: 1 }}
        renderRow={(r): ReactNode => <text content={r.label} />}
      />
    </box>
  );
};

/** Recreates equivalent row objects every time the controller renders. */
const RecreatedRowsHarness = function RecreatedRowsHarness({
  initial,
  onReady,
  ...options
}: HarnessOptions & {
  initial: readonly Row[];
  onReady: (setRows: (rows: readonly Row[]) => void) => void;
}): ReactNode {
  const [rowsSource, setRowsSource] = useState(initial);
  onReady(setRowsSource);
  const rows = rowsSource.map((item) => ({ ...item }));
  const document = useDocumentController<Row>({ adapter: ADAPTER, rows, ...options });
  const mode = useMode();
  handle = document;

  return (
    <box flexDirection="column" height="100%">
      <text
        content={`mode:${mode} active:${document.activeKey ?? "-"}/${document.activeIndex ?? "-"}`}
        flexShrink={0}
      />
      <Document
        controller={document}
        showGutter={false}
        style={{ flexGrow: 1 }}
        renderRow={(r): ReactNode => <text content={r.label} />}
      />
    </box>
  );
};

/** Lets a test swap the row collection after mount. */
const DynamicHarness = function DynamicHarness({
  initial,
  onReady,
  ...options
}: HarnessOptions & {
  initial: readonly Row[];
  onReady: (setRows: (rows: readonly Row[]) => void) => void;
}): ReactNode {
  const [rows, setRows] = useState(initial);
  onReady(setRows);
  return <Harness rows={rows} {...options} />;
};

let session: TestSession;

afterEach(() => {
  session?.renderer.destroy();
  handle = null;
});

const setup = async function setup(rows: readonly Row[], options: HarnessOptions = {}) {
  session = await testRender(
    <TooeeProvider>
      <Harness rows={rows} {...options} />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 70 },
  );
  await session.renderOnce();
  return session;
};

const setupDynamic = async function setupDynamic(
  initial: readonly Row[],
  options: HarnessOptions = {},
) {
  let setRows!: (rows: readonly Row[]) => void;
  session = await testRender(
    <TooeeProvider>
      <DynamicHarness
        initial={initial}
        onReady={(s) => {
          setRows = s;
        }}
        {...options}
      />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 70 },
  );
  await session.renderOnce();
  return async (rows: readonly Row[]) => {
    await act(async () => {
      setRows(rows);
      await Promise.resolve();
    });
    await session.renderOnce();
  };
};

const setupWithRecreatedRows = async function setupWithRecreatedRows(
  initial: readonly Row[],
  options: HarnessOptions = {},
) {
  let setRows!: (rows: readonly Row[]) => void;
  session = await testRender(
    <TooeeProvider>
      <RecreatedRowsHarness
        initial={initial}
        onReady={(nextSetRows) => {
          setRows = nextSetRows;
        }}
        {...options}
      />
    </TooeeProvider>,
    { height: 24, kittyKeyboard: true, width: 70 },
  );
  await session.renderOnce();
  return async (rows: readonly Row[]) => {
    await act(async () => {
      setRows(rows);
      await Promise.resolve();
    });
    await session.renderOnce();
  };
};

const active = function active(): string {
  return `${controller().activeKey ?? "-"}/${controller().activeIndex ?? "-"}`;
};

describe("row lifecycle", () => {
  test("0 rows leaves no active row; N rows adopt the first selectable one", async () => {
    const setRows = await setupDynamic([]);
    expect(active()).toBe("-/-");
    expect(controller().activeRow).toBeUndefined();

    await setRows(THREE);
    expect(active()).toBe("a/0");
    expect(controller().activeRow).toEqual(row("a"));
  });

  test("N to 0 rows clears the active row", async () => {
    const setRows = await setupDynamic(THREE);
    await setRows([]);
    expect(active()).toBe("-/-");
    expect(controller().activeRow).toBeUndefined();
  });

  test("shrinking below the cursor clamps it to the last row", async () => {
    const setRows = await setupDynamic(THREE);
    await press(session, "j");
    await press(session, "j");
    expect(active()).toBe("c/2");

    await setRows([row("a")]);
    expect(active()).toBe("a/0");
  });

  test("the cursor skips non-selectable gaps", async () => {
    await setup([row("head", "head", false), row("a"), row("sep", "sep", false), row("b")]);
    expect(active()).toBe("a/1");

    await press(session, "j");
    expect(active()).toBe("b/3");

    await press(session, "k");
    expect(active()).toBe("a/1");
  });
});

describe("stable keys across reorder", () => {
  test("the cursor follows its row when rows are reordered", async () => {
    const setRows = await setupDynamic(THREE, { preserveCursorByKey: true });
    await press(session, "j");
    expect(active()).toBe("b/1");

    await setRows([row("c"), row("b"), row("a")]);
    expect(active()).toBe("b/1");

    await setRows([row("b"), row("c"), row("a")]);
    expect(active()).toBe("b/0");
  });

  test("explicit navigation wins over a fresh rows update in the same cycle", async () => {
    const setRows = await setupDynamic(THREE, { preserveCursorByKey: true });

    await act(async () => {
      controller().navigation.setCursor(1);
      await setRows([...THREE]);
    });

    expect(active()).toBe("b/1");
  });

  test("a vanished active row clamps to the nearest selectable row", async () => {
    const setRows = await setupDynamic(THREE, { preserveCursorByKey: true });
    await press(session, "j");
    await press(session, "j");
    expect(active()).toBe("c/2");

    await setRows([row("a"), row("b")]);
    expect(active()).toBe("b/1");
  });

  test("a vanished active row skips a non-selectable landing row", async () => {
    const setRows = await setupDynamic(THREE, { preserveCursorByKey: true });
    await press(session, "j");
    await press(session, "j");
    expect(active()).toBe("c/2");

    await setRows([row("a"), row("sep", "sep", false)]);
    expect(active()).toBe("a/0");
  });

  test("without preserveCursorByKey the cursor stays positional", async () => {
    const setRows = await setupDynamic(THREE);
    await press(session, "j");
    expect(active()).toBe("b/1");

    await setRows([row("c"), row("b"), row("a")]);
    expect(active()).toBe("b/1");

    await setRows([row("b"), row("c"), row("a")]);
    expect(active()).toBe("c/1");
  });

  test("toggled rows keep their identity across a reorder", async () => {
    const setRows = await setupDynamic(THREE, { multiSelect: true });
    await pressTab(session);
    expect(controller().selectedRows.map((r) => r.id)).toEqual(["a"]);

    await setRows([row("c"), row("b"), row("a")]);
    expect([...controller().toggledIndices]).toEqual([2]);
    expect(controller().selectedRows.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("selection", () => {
  test("toggled rows drive selectedRows in row order", async () => {
    await setup(THREE, { multiSelect: true });
    await press(session, "j");
    await press(session, "j");
    await pressTab(session);
    await press(session, "k");
    await press(session, "k");
    await pressTab(session);

    expect([...controller().toggledIndices]).toEqual([0, 2]);
    expect(controller().selectedRows.map((r) => r.id)).toEqual(["a", "c"]);
  });

  test("shift+tab toggles and moves up", async () => {
    await setup(THREE, { multiSelect: true });
    await press(session, "j");
    await press(session, "j");
    await pressTab(session, { shift: true });

    expect([...controller().toggledIndices]).toEqual([2]);
    expect(active()).toBe("b/1");
  });

  test("range selection in select mode drives selectedRows", async () => {
    await setup(THREE);
    await press(session, "v");
    await press(session, "j");

    expect(controller().navigation.selection).toEqual({ end: 1, start: 0 });
    expect(controller().selectedRows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  test("toggle commands are absent without multiSelect", async () => {
    await setup(THREE);
    await pressTab(session);
    expect(controller().toggledIndices.size).toBe(0);
  });
});

const query = async function query(text: string) {
  await press(session, "/");
  await act(async () => {
    expectDefined(controller().search).setSearchQuery(text);
    await Promise.resolve();
  });
  await session.renderOnce();
};

describe("search", () => {
  const ROWS = [row("a", "alpha"), row("b", "beta"), row("c", "gamma"), row("d", "Alphabet")];

  test("the default matcher searches adapter text case-insensitively", async () => {
    await setup(ROWS);
    await query("alpha");
    expect(expectDefined(controller().search).matchingLines).toEqual([0, 3]);
  });

  test("an empty query matches nothing", async () => {
    await setup(ROWS);
    await query("");
    expect(expectDefined(controller().search).matchingLines).toEqual([]);
  });

  test("submitting jumps to the first match; n and shift+n cycle", async () => {
    await setup(ROWS);
    await query("alpha");
    await act(async () => {
      expectDefined(controller().search).submitSearch();
      await Promise.resolve();
    });
    await session.renderOnce();
    expect(active()).toBe("a/0");

    await press(session, "n");
    expect(active()).toBe("d/3");

    await press(session, "n");
    expect(active()).toBe("a/0");

    await press(session, "n", { shift: true });
    expect(active()).toBe("d/3");
  });

  test("escape cancels the search and clears matches", async () => {
    await setup(ROWS);
    await query("alpha");
    expect(expectDefined(controller().search).matchingLines).toEqual([0, 3]);

    await pressEscape(session);
    expect(expectDefined(controller().search).searchActive).toBe(false);
    expect(expectDefined(controller().search).matchingLines).toEqual([]);
  });

  test("a custom matcher receives the query and the typed rows", async () => {
    const search: DocumentSearchOptions<Row> = {
      match: (text, rows) => rows.flatMap((r, index) => (r.id === text ? [index] : [])),
    };
    await setup(ROWS, { search });
    await query("c");
    expect(expectDefined(controller().search).matchingLines).toEqual([2]);
  });

  test("recreated rows settle and changed content rematches a committed query", async () => {
    const setRows = await setupWithRecreatedRows(ROWS);

    await query("alpha");
    expect(expectDefined(controller().search).matchingLines).toEqual([0, 3]);
    expect(active()).toBe("a/0");

    await act(async () => {
      expectDefined(controller().search).submitSearch();
      await Promise.resolve();
    });
    await session.renderOnce();

    await setRows([row("a", "first"), row("b", "alpha"), row("c", "gamma"), row("d", "last")]);

    expect(expectDefined(controller().search).matchingLines).toEqual([1]);
    expect(active()).toBe("b/1");
  });

  test("search: false produces no search state and no / command", async () => {
    await setup(ROWS, { search: false });
    expect(controller().search).toBeNull();

    await press(session, "/");
    // `/` never switched the app into insert mode: the command is unregistered.
    expect(session.captureCharFrame()).toContain("mode:cursor");
  });
});

describe("decorations", () => {
  test("the cursor layer tracks the cursor at the published priority", async () => {
    await setup(THREE);
    expect(describeLayers(controller().decorations)).toBe(
      `${DocumentDecorationPriorities.CURSOR}@0`,
    );

    await press(session, "j");
    expect(describeLayers(controller().decorations)).toBe(
      `${DocumentDecorationPriorities.CURSOR}@1`,
    );
  });

  test("search, toggled, current-match and cursor layers compose", async () => {
    await setup([row("a", "alpha"), row("b", "beta"), row("c", "alto")], { multiSelect: true });
    await pressTab(session);
    await press(session, "/");
    await act(async () => {
      expectDefined(controller().search).setSearchQuery("al");
      await Promise.resolve();
    });
    await session.renderOnce();

    const { SEARCH_MATCH, TOGGLED, CURRENT_MATCH, CURSOR } = DocumentDecorationPriorities;
    expect(describeLayers(controller().decorations)).toBe(
      `${SEARCH_MATCH}@0+2 ${TOGGLED}@0 ${CURRENT_MATCH}@0 ${CURSOR}@0`,
    );
  });

  test("the selection layer spans the select-mode range", async () => {
    await setup(THREE);
    await press(session, "v");
    await press(session, "j");

    const { SELECTION, CURSOR } = DocumentDecorationPriorities;
    expect(describeLayers(controller().decorations)).toBe(`${SELECTION}@0+1 ${CURSOR}@1`);
  });

  test("external layers are appended and keep their own priority", async () => {
    const external: DecorationLayer = {
      *forVisibleRows() {
        yield { background: "#ff0000", row: 1 };
      },
      priority: 250,
    };
    await setup(THREE, { decorations: [external] });
    expect(describeLayers(controller().decorations)).toBe(
      `${DocumentDecorationPriorities.CURSOR}@0 250@1`,
    );
  });
});

const wheelDown = async function wheelDown(): Promise<void> {
  await act(async () => {
    await session.mockMouse.scroll(10, 10, "down");
  });
  await session.renderOnce();
};

const wheelAway = async function wheelAway(): Promise<number> {
  await wheelDown();
  await wheelDown();
  await wheelDown();
  const { scrollTop } = expectDefined(controller().ref.current);
  expect(scrollTop).toBeGreaterThan(0);
  expect(active()).toBe("r0/0");
  expect(session.captureCharFrame()).not.toMatch(/^row-0\s*$/mu);
  return scrollTop;
};

describe("scroll follow", () => {
  const MANY = Array.from({ length: 40 }, (_, i) => row(`r${i}`, `row-${i}`));

  test("moving the cursor to the bottom scrolls the row into view", async () => {
    await setup(MANY);
    expect(session.captureCharFrame()).toContain("row-0");

    await press(session, "g", { shift: true });
    const frame = session.captureCharFrame();
    expect(frame).toContain("row-39");
    expect(frame).not.toMatch(/^row-0\s*$/mu);
  });

  test("a first-frame cursor below the fold scrolls once geometry exists", async () => {
    // The first 30 rows are unselectable, so the initial cursor lands on row 30
    // — before any geometry has been computed.
    const rows = MANY.map((r, i) => (i < 30 ? { ...r, selectable: false } : r));
    await setup(rows);

    expect(active()).toBe("r30/30");
    const frame = session.captureCharFrame();
    expect(frame).toContain("row-30");
    expect(frame).not.toMatch(/^row-0\s*$/mu);
  });

  /** Wheel-scrolls the document down, which moves the viewport and leaves the cursor alone. */
  test("appending rows keeps a wheel-scrolled viewport in place", async () => {
    const setRows = await setupDynamic(MANY);
    const scrollTop = await wheelAway();

    await setRows([...MANY, row("r40", "row-40"), row("r41", "row-41")]);

    expect(active()).toBe("r0/0");
    expect(expectDefined(controller().ref.current).scrollTop).toBe(scrollTop);
    expect(session.captureCharFrame()).not.toMatch(/^row-0\s*$/mu);
  });

  test("changing row text in place keeps a wheel-scrolled viewport in place", async () => {
    const setRows = await setupDynamic(MANY);
    const scrollTop = await wheelAway();

    await setRows(MANY.map((r) => ({ ...r, label: `${r.label} updated` })));

    expect(active()).toBe("r0/0");
    expect(expectDefined(controller().ref.current).scrollTop).toBe(scrollTop);
    const frame = session.captureCharFrame();
    expect(frame).toContain("updated");
    expect(frame).not.toMatch(/^row-0 updated\s*$/mu);
  });

  test("moving the cursor after a rows update still follows it", async () => {
    const setRows = await setupDynamic(MANY);
    await wheelAway();
    await setRows([...MANY, row("r40", "row-40")]);

    await press(session, "g", { shift: true });

    expect(active()).toBe("r40/40");
    expect(session.captureCharFrame()).toContain("row-40");
  });

  test("g g brings back the first row when the cursor is already on it", async () => {
    await setup(MANY);
    await wheelAway();

    await press(session, "g");
    await press(session, "g");

    expect(active()).toBe("r0/0");
    expect(expectDefined(controller().ref.current).scrollTop).toBe(0);
    expect(session.captureCharFrame()).toContain("row-0");
  });

  test("G brings back the last row when the cursor is already on it", async () => {
    await setup(MANY);
    await press(session, "g", { shift: true });
    expect(active()).toBe("r39/39");
    await act(async () => {
      await session.mockMouse.scroll(10, 10, "up");
    });
    await session.renderOnce();
    expect(session.captureCharFrame()).not.toContain("row-39");

    await press(session, "g", { shift: true });

    expect(active()).toBe("r39/39");
    expect(session.captureCharFrame()).toContain("row-39");
  });
});

const wheel = async function wheel(direction: "up" | "down"): Promise<void> {
  await act(async () => {
    await session.mockMouse.scroll(10, 10, direction);
  });
  await session.renderOnce();
};

const document = function document() {
  return expectDefined(controller().ref.current);
};

describe("tail follow", () => {
  const MANY = Array.from({ length: 40 }, (_, i) => row(`r${i}`, `row-${i}`));
  const MORE = [...MANY, row("r40", "row-40"), row("r41", "row-41")];
  const FOLLOW = { followTail: true } as const;

  test("opens on the last row with the viewport at the bottom", async () => {
    await setup(MANY, FOLLOW);

    expect(active()).toBe("r39/39");
    expect(document().isScrolledToBottom()).toBe(true);
    const frame = session.captureCharFrame();
    expect(frame).toContain("row-39");
    expect(frame).not.toMatch(/^row-0\s*$/mu);
  });

  test("appended rows keep a pinned viewport at the bottom and move the tail cursor", async () => {
    const setRows = await setupDynamic(MANY, FOLLOW);

    await setRows(MORE);

    expect(active()).toBe("r41/41");
    expect(document().isScrolledToBottom()).toBe(true);
    expect(session.captureCharFrame()).toContain("row-41");
  });

  test("rows that stream into an empty document are followed past the fold", async () => {
    const setRows = await setupDynamic([], FOLLOW);

    await setRows(MANY.slice(0, 10));
    await setRows(MANY.slice(0, 25));
    await setRows(MANY);

    expect(active()).toBe("r39/39");
    expect(document().isScrolledToBottom()).toBe(true);
    const frame = session.captureCharFrame();
    expect(frame).toContain("row-39");
    expect(frame).not.toMatch(/^row-0\s*$/mu);
  });

  test("scrolling up releases the pin", async () => {
    const setRows = await setupDynamic(MANY, FOLLOW);
    await wheel("up");
    await wheel("up");
    const { scrollTop } = document();
    expect(document().isScrolledToBottom()).toBe(false);

    await setRows(MORE);

    expect(active()).toBe("r39/39");
    expect(document().scrollTop).toBe(scrollTop);
    expect(session.captureCharFrame()).not.toContain("row-41");
  });

  test("scrolling back to the bottom restores the pin", async () => {
    const setRows = await setupDynamic(MANY, FOLLOW);
    await wheel("up");
    await wheel("up");
    await wheel("down");
    await wheel("down");
    expect(document().isScrolledToBottom()).toBe(true);

    await setRows(MORE);

    expect(active()).toBe("r41/41");
    expect(document().isScrolledToBottom()).toBe(true);
    expect(session.captureCharFrame()).toContain("row-41");
  });

  test("G after scrolling up restores the pin", async () => {
    const setRows = await setupDynamic(MANY, FOLLOW);
    await wheel("up");
    await wheel("up");
    expect(document().isScrolledToBottom()).toBe(false);

    await press(session, "g", { shift: true });
    expect(document().isScrolledToBottom()).toBe(true);

    await setRows(MORE);

    expect(active()).toBe("r41/41");
    expect(document().isScrolledToBottom()).toBe(true);
    expect(session.captureCharFrame()).toContain("row-41");
  });

  test("a cursor moved off the tail stays on its row while the viewport follows", async () => {
    const setRows = await setupDynamic(MANY, FOLLOW);
    await press(session, "k");
    expect(active()).toBe("r38/38");

    await setRows(MORE);

    expect(active()).toBe("r38/38");
    expect(document().isScrolledToBottom()).toBe(true);
    expect(session.captureCharFrame()).toContain("row-41");
  });

  test("without followTail, appended rows do not move a bottom viewport", async () => {
    const setRows = await setupDynamic(MANY);
    await press(session, "g", { shift: true });
    expect(active()).toBe("r39/39");

    await setRows(MORE);

    expect(active()).toBe("r39/39");
    expect(session.captureCharFrame()).not.toContain("row-41");
  });
});
