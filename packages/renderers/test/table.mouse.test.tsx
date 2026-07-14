import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { Table } from "../src/table.js";
import { useRowMouseBindings } from "./support/bindings.js";
import type { RowMouseCallbacks } from "./support/bindings.js";

const cols = function cols(headers: string[]) {
  return headers.map((header, index) => ({ header, key: `col_${index}` }));
};
const rows = function rows(columns: ReturnType<typeof cols>, values: string[][]) {
  return values.map((row) => {
    const record: Record<string, string> = {};
    for (const [index, column] of columns.entries()) {
      record[column.key] = row[index] ?? "";
    }
    return record;
  });
};

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

const TableHarness = function TableHarness(callbacks: RowMouseCallbacks): React.ReactNode {
  return (
    <Table columns={COLUMNS} rows={DATA} maxWidth={40} document={useRowMouseBindings(callbacks)} />
  );
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("Table mouse interaction", () => {
  test("left-click maps click Y to the row index", async () => {
    const clicked: number[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <TableHarness
          onRowClick={(i) => {
            clicked.push(i);
          }}
        />
      </ThemeSwitcherProvider>,
      { height: 15, width: 40 },
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
        <TableHarness
          onRowContextMenu={(index, x, y) => {
            events.push({ index, x, y });
          }}
        />
      </ThemeSwitcherProvider>,
      { height: 15, width: 40 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, DATA_TOP_Y + 1, MouseButtons.RIGHT);
    });
    await testSetup.renderOnce();

    expect(events.length).toBe(1);
    const [event] = events;
    if (event === undefined) {
      throw new Error("Expected a context-menu event");
    }
    expect(event.index).toBe(1);
    expect(event.x).toBe(CONTENT_X);
    expect(event.y).toBe(DATA_TOP_Y + 1);
  });

  test("left-click does not trigger the context-menu handler", async () => {
    let ctx = 0;
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <TableHarness
          onRowClick={() => {}}
          onRowContextMenu={() => {
            ctx += 1;
          }}
        />
      </ThemeSwitcherProvider>,
      { height: 15, width: 40 },
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
        <TableHarness
          onRowClick={(i) => {
            clicked.push(i);
          }}
        />
      </ThemeSwitcherProvider>,
      { height: 15, width: 40 },
    );
    await testSetup.renderOnce();

    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, DATA_TOP_Y + DATA.length + 1, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(clicked).toEqual([]);
  });
});
