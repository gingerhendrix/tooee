import { testRender } from "../../../test/support/test-render.ts";
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
import { press, pressTab, pressEscape } from "./support/test-helpers.ts";
import type { TestSession } from "./support/test-helpers.ts";

interface Row {
  id: string;
  label: string;
  selectable?: boolean;
}

function row(id: string, label = id, selectable = true): Row {
  return { id, label, selectable };
}

const ADAPTER = {
  getKey: (r: Row) => r.id,
  getText: (r: Row) => r.label,
  isSelectable: (r: Row) => r.selectable !== false,
};

const THREE = [row("a"), row("b"), row("c")];

// Module-level handle for imperative access to controller state, matching the
// pattern in search.test.tsx.
let handle: DocumentController<Row> | null = null;

function controller(): DocumentController<Row> {
  if (!handle) throw new Error("controller not mounted");
  return handle;
}

/** Renders every layer as `priority@row+row` so decoration composition is observable. */
function describeLayers(layers: readonly DecorationLayer[]): string {
  return layers
    .map(
      (layer) =>
        `${layer.priority}@${Array.from(layer.forVisibleRows(0, 99))
          .map((d) => d.row)
          .join("+")}`,
    )
    .join(" ");
}

type HarnessOptions = Omit<UseDocumentControllerOptions<Row>, "adapter" | "rows">;

function Harness({ rows, ...options }: HarnessOptions & { rows: readonly Row[] }) {
  const document = useDocumentController<Row>({ rows, adapter: ADAPTER, ...options });
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
        renderRow={(r) => <text content={r.label} />}
      />
    </box>
  );
}

/** Lets a test swap the row collection after mount. */
function DynamicHarness({
  initial,
  onReady,
  ...options
}: HarnessOptions & {
  initial: readonly Row[];
  onReady: (setRows: (rows: readonly Row[]) => void) => void;
}) {
  const [rows, setRows] = useState(initial);
  onReady(setRows);
  return <Harness rows={rows} {...options} />;
}

let session: TestSession;

afterEach(() => {
  session?.renderer.destroy();
  handle = null;
});

async function setup(rows: readonly Row[], options: HarnessOptions = {}) {
  session = await testRender(
    <TooeeProvider>
      <Harness rows={rows} {...options} />
    </TooeeProvider>,
    { width: 70, height: 24, kittyKeyboard: true },
  );
  await session.renderOnce();
  return session;
}

async function setupDynamic(initial: readonly Row[], options: HarnessOptions = {}) {
  let setRows!: (rows: readonly Row[]) => void;
  session = await testRender(
    <TooeeProvider>
      <DynamicHarness initial={initial} onReady={(s) => (setRows = s)} {...options} />
    </TooeeProvider>,
    { width: 70, height: 24, kittyKeyboard: true },
  );
  await session.renderOnce();
  return async (rows: readonly Row[]) => {
    await act(async () => setRows(rows));
    await session.renderOnce();
  };
}

function active(): string {
  return `${controller().activeKey ?? "-"}/${controller().activeIndex ?? "-"}`;
}

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
    await pressTab(session); // toggle "a" at index 0
    expect(controller().selectedRows.map((r) => r.id)).toEqual(["a"]);

    await setRows([row("c"), row("b"), row("a")]);
    expect(Array.from(controller().toggledIndices)).toEqual([2]);
    expect(controller().selectedRows.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("selection", () => {
  test("toggled rows drive selectedRows in row order", async () => {
    await setup(THREE, { multiSelect: true });
    await press(session, "j");
    await press(session, "j");
    await pressTab(session); // c
    await press(session, "k");
    await press(session, "k");
    await pressTab(session); // a

    expect(Array.from(controller().toggledIndices)).toEqual([0, 2]);
    expect(controller().selectedRows.map((r) => r.id)).toEqual(["a", "c"]);
  });

  test("shift+tab toggles and moves up", async () => {
    await setup(THREE, { multiSelect: true });
    await press(session, "j");
    await press(session, "j");
    await pressTab(session, { shift: true });

    expect(Array.from(controller().toggledIndices)).toEqual([2]);
    expect(active()).toBe("b/1");
  });

  test("range selection in select mode drives selectedRows", async () => {
    await setup(THREE);
    await press(session, "v");
    await press(session, "j");

    expect(controller().navigation.selection).toEqual({ start: 0, end: 1 });
    expect(controller().selectedRows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  test("toggle commands are absent without multiSelect", async () => {
    await setup(THREE);
    await pressTab(session);
    expect(controller().toggledIndices.size).toBe(0);
  });
});

describe("search", () => {
  const ROWS = [row("a", "alpha"), row("b", "beta"), row("c", "gamma"), row("d", "Alphabet")];

  async function query(text: string) {
    await press(session, "/");
    await act(async () => controller().search!.setSearchQuery(text));
    await session.renderOnce();
  }

  test("the default matcher searches adapter text case-insensitively", async () => {
    await setup(ROWS);
    await query("alpha");
    expect(controller().search!.matchingLines).toEqual([0, 3]);
  });

  test("an empty query matches nothing", async () => {
    await setup(ROWS);
    await query("");
    expect(controller().search!.matchingLines).toEqual([]);
  });

  test("submitting jumps to the first match; n and shift+n cycle", async () => {
    await setup(ROWS);
    await query("alpha");
    await act(async () => controller().search!.submitSearch());
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
    expect(controller().search!.matchingLines).toEqual([0, 3]);

    await pressEscape(session);
    expect(controller().search!.searchActive).toBe(false);
    expect(controller().search!.matchingLines).toEqual([]);
  });

  test("a custom matcher receives the query and the typed rows", async () => {
    const search: DocumentSearchOptions<Row> = {
      match: (text, rows) => rows.flatMap((r, index) => (r.id === text ? [index] : [])),
    };
    await setup(ROWS, { search });
    await query("c");
    expect(controller().search!.matchingLines).toEqual([2]);
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
    await pressTab(session); // toggle row 0
    await press(session, "/");
    await act(async () => controller().search!.setSearchQuery("al"));
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
      priority: 250,
      *forVisibleRows() {
        yield { row: 1, background: "#ff0000" };
      },
    };
    await setup(THREE, { decorations: [external] });
    expect(describeLayers(controller().decorations)).toBe(
      `${DocumentDecorationPriorities.CURSOR}@0 250@1`,
    );
  });
});

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
});
