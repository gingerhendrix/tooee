import { afterEach, expect, test } from "bun:test";

import { RGBA, TextRenderable } from "@opentui/core";
import { createTestRenderer } from "@opentui/core/testing";

import { RowDocumentRenderable } from "../src/row-document-renderable.js";

let setup: Awaited<ReturnType<typeof createTestRenderer>>;

afterEach(async () => {
  await setup?.dispose();
});

test("retains offset gutter and decorations through scroll, restyle and unrelated paint", async () => {
  setup = await createTestRenderer({ height: 10, width: 32 });

  const document = new RowDocumentRenderable(setup.renderer, {
    decorations: [{ forVisibleRows: () => [{ row: 0, sign: { text: "!" } }], priority: 1 }],
    height: 4,
    id: "rows",
    left: 3,
    position: "absolute",
    signColumnWidth: 1,
    top: 2,
    width: 20,
  });

  for (let i = 0; i < 8; i += 1) {
    document.add(new TextRenderable(setup.renderer, { content: `row-${i + 1}`, id: `row-${i}` }));
  }

  const sibling = new TextRenderable(setup.renderer, { content: "before", id: "sibling" });

  setup.renderer.root.add(document);
  setup.renderer.root.add(sibling);
  await setup.renderOnce();
  const initial = setup.captureCharFrame().split("\n");
  expect(initial[2].slice(3, 11)).toBe("1! row-1");
  expect(document.getRowAtScreenY(2)).toBe(0);
  expect(document.getRowAtScreenY(1)).toBeNull();
  expect(document.getRowAtScreenY(6)).toBeNull();

  sibling.content = "after";
  await setup.renderOnce();
  expect(setup.captureCharFrame().split("\n").slice(2, 6)).toEqual(initial.slice(2, 6));

  document.scrollTop = 2;
  await setup.renderOnce();
  expect(setup.captureCharFrame().split("\n")[2].slice(3, 11)).toBe("3  row-3");
  expect(document.getRowAtScreenY(2)).toBe(2);

  document.decorations = [{ forVisibleRows: () => [{ row: 2, sign: { text: "?" } }], priority: 1 }];
  document.palette = { gutterBg: "#123456", gutterFg: "#abcdef" };
  await setup.renderOnce();
  expect(setup.captureCharFrame().split("\n")[2].slice(3, 11)).toBe("3? row-3");
  const gutter = setup.captureSpans().lines[2].spans.find((span) => span.text.includes("3?"));
  expect(gutter?.bg.toString()).toBe(RGBA.fromHex("#123456").toString());
  expect(gutter?.fg.toString()).toBe(RGBA.fromHex("#abcdef").toString());

  document.decorations = [];
  await setup.renderOnce();
  expect(setup.captureCharFrame().split("\n")[2].slice(3, 11)).toBe("3  row-3");
});

test("updates a single provider row's wrapped height on the first resized frame", async () => {
  setup = await createTestRenderer({ height: 10, width: 40 });

  const document = new RowDocumentRenderable(setup.renderer, {
    height: 10,
    id: "provider",
    width: "100%",
  });

  document.add(
    new TextRenderable(setup.renderer, {
      content: "alpha beta gamma delta epsilon zeta",
      id: "text",
    })
  );

  setup.renderer.root.add(document);
  await setup.renderOnce();
  expect(document.rowCount).toBe(1);
  expect(document.getRowMetrics(0)?.virtualHeight).toBe(1);
  setup.resize(18, 10);
  await setup.renderOnce();
  expect(document.getRowMetrics(0)?.virtualHeight).toBe(3);
  expect(document.virtualRowCount).toBe(3);
  expect(document.getRowAtScreenY(2)).toBe(0);
  expect(document.getRowAtScreenY(3)).toBeNull();
});
