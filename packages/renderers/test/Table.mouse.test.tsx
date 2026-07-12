import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { Table } from "../src/Table.js";
import { useRowMouseBindings, type RowMouseCallbacks } from "./support/bindings.js";

function cols(headers: string[]) {
  return headers.map((header, index) => ({ key: `col_${index}`, header }));
}
function rows(columns: ReturnType<typeof cols>, values: string[][]) {
  return values.map((row) => {
    const record: Record<string, string> = {};
    columns.forEach((column, index) => {
      record[column.key] = row[index] ?? "";
    });
    return record;
  });
}

const COLUMNS = cols(["Name", "Age"]);
const DATA = rows(COLUMNS, [
  ["Alice", "30"],
  ["Bob", "25"],
  ["Carol", "28"],
]);

// Table chrome above the scrolling data rows: header text row (y=0) + underline (y=1).
// Data rows therefore start at y=2. Gutter (line numbers + sign) is ~5 wide, so we
// click at x=8 to land on cell content.
const DATA_TOP_Y = 2;
const CONTENT_X = 8;

function TableHarness(callbacks: RowMouseCallbacks) {
  return (
    <Table columns={COLUMNS} rows={DATA} maxWidth={40} document={useRowMouseBindings(callbacks)} />
  );
}

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("Table mouse interaction", () => {
  test("left-click maps click Y to the row index", async () => {
    const clicked: number[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <TableHarness onRowClick={(i) => clicked.push(i)} />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, DATA_TOP_Y, MouseButtons.LEFT);
    });
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, DATA_TOP_Y + 2, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(clicked).toEqual([0, 2]);
  });

  test("right-click reports the row index and coordinates", async () => {
    const events: { index: number; x: number; y: number }[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <TableHarness onRowContextMenu={(index, x, y) => events.push({ index, x, y })} />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, DATA_TOP_Y + 1, MouseButtons.RIGHT);
    });
    await testSetup.renderOnce();

    expect(events.length).toBe(1);
    expect(events[0]!.index).toBe(1);
    expect(events[0]!.x).toBe(CONTENT_X);
    expect(events[0]!.y).toBe(DATA_TOP_Y + 1);
  });

  test("left-click does not trigger the context-menu handler", async () => {
    let ctx = 0;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <TableHarness onRowClick={() => {}} onRowContextMenu={() => ctx++} />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    );
    await testSetup.renderOnce();
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, DATA_TOP_Y, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();
    expect(ctx).toBe(0);
  });

  test("a click on the empty space below the last row is ignored", async () => {
    const clicked: number[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <TableHarness onRowClick={(i) => clicked.push(i)} />
      </ThemeSwitcherProvider>,
      { width: 40, height: 15 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, DATA_TOP_Y + DATA.length + 1, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(clicked).toEqual([]);
  });
});
