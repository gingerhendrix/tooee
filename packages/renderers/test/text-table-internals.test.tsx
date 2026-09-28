import { test, expect, describe, afterEach } from "bun:test";

import { BoxRenderable } from "@opentui/core";
import type { TextTableContent, TextTableRenderable } from "@opentui/core";
import { testRender } from "@tooee/test-support";
import { createRef } from "react";

import "../src/text-table.js";
import { hasTextTableInternals, textTableCellAt } from "../src/text-table-internals.js";

/*
 * Pins the private TextTableRenderable members that `src/text-table-internals.ts` reads.
 * A failure here after an OpenTUI upgrade means the table link hit test needs updating.
 */

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

const cell = function cell(text: string): TextTableContent[number][number] {
  return [{ __isChunk: true, text }];
};

const renderTable = async function renderTable(content: TextTableContent, width: number) {
  const ref = createRef<TextTableRenderable>();
  testSetup = await testRender(
    <text-table
      ref={ref}
      content={content}
      wrapMode="word"
      columnWidthMode="content"
      cellPadding={0}
      border={true}
      borderStyle="single"
    />,
    { height: 12, width }
  );
  await testSetup.renderOnce();
  if (ref.current === null) {
    throw new Error("text-table did not mount");
  }
  return ref.current;
};

describe("TextTableRenderable internals", () => {
  test("the OpenTUI table still has the private members the hit test reads", async () => {
    const table = await renderTable([[cell("A"), cell("B")]], 20);
    expect(hasTextTableInternals(table)).toBe(true);
  });

  test("other renderables do not match", async () => {
    await renderTable([[cell("A")]], 20);
    expect(hasTextTableInternals(new BoxRenderable(testSetup.renderer, {}))).toBe(false);
  });

  test("maps screen positions to cells and wrapped lines", async () => {
    // ┌──┬────────┐
    // │h │head    │
    // ├──┼────────┤
    // │r │one two │
    // │  │three   │
    // └──┴────────┘
    const table = await renderTable(
      [
        [cell("h"), cell("head")],
        [cell("r"), cell("one two three")],
      ],
      14
    );
    const frame = testSetup.captureCharFrame().split("\n");
    const threeY = frame.findIndex((line) => line.includes("three"));
    const threeX = frame[threeY]?.indexOf("three") ?? -1;
    const headY = frame.findIndex((line) => line.includes("head"));
    const headX = frame[headY]?.indexOf("head") ?? -1;
    expect(threeY).toBeGreaterThan(headY);

    expect(textTableCellAt(table, headX + 1, headY)).toEqual({
      column: 1,
      line: 0,
      offset: 1,
      row: 0,
    });
    // "three" is on the second visual line of the cell but the same logical line.
    expect(textTableCellAt(table, threeX + 2, threeY)).toEqual({
      column: 1,
      line: 0,
      offset: 10,
      row: 1,
    });
    // Borders map to no cell.
    expect(textTableCellAt(table, table.x, headY)).toBeNull();
    expect(textTableCellAt(table, headX, table.y)).toBeNull();
    // Blank space after the text on a line maps to no text.
    expect(textTableCellAt(table, threeX + 6, threeY)).toBeNull();
  });
});
