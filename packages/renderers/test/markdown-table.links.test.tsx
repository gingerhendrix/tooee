import { test, expect, describe, afterEach } from "bun:test";

import { MouseButtons } from "@opentui/core/testing";
import { testRender } from "@tooee/test-support";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { act } from "react";
import type { ReactNode } from "react";

import { MarkdownView } from "../src/markdown-view.js";
import { tableLinkMouseHandler } from "../src/markdown/table-links.js";
import { useRowMouseBindings } from "./support/bindings.js";
import type { RowMouseCallbacks } from "./support/bindings.js";

const MarkdownHarness = function MarkdownHarness({
  content,
  onLinkActivate,
  ...callbacks
}: RowMouseCallbacks & {
  content: string;
  onLinkActivate?: (href: string) => boolean;
}): ReactNode {
  return (
    <MarkdownView
      content={content}
      document={useRowMouseBindings(callbacks)}
      onLinkActivate={onLinkActivate}
    />
  );
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

interface Point {
  x: number;
  y: number;
}

/** Screen position of the first rendered occurrence of `text`, searched from `fromLine`. */
const locate = function locate(text: string, fromLine = 0): Point {
  const lines = testSetup.captureCharFrame().split("\n");

  for (let y = fromLine; y < lines.length; y += 1) {
    const x = lines[y]?.indexOf(text) ?? -1;

    if (x !== -1) {
      return { x, y };
    }
  }

  throw new Error(`"${text}" is not on screen:\n${lines.join("\n")}`);
};

const renderTable = async function renderTable(
  content: string,
  width: number,
  onLinkActivate?: (href: string) => boolean
): Promise<{ activated: string[]; selected: number[] }> {
  const activated: string[] = [];
  const selected: number[] = [];
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownHarness
        content={content}
        onRowClick={(index) => {
          selected.push(index);
        }}
        onLinkActivate={
          onLinkActivate === undefined
            ? undefined
            : (href) => {
                activated.push(href);

                return onLinkActivate(href);
              }
        }
      />
    </ThemeSwitcherProvider>,
    { height: 20, width }
  );
  await testSetup.renderOnce();

  return { activated, selected };
};

const click = async function click({ x, y }: Point): Promise<void> {
  await act(async () => {
    await testSetup.mockMouse.click(x, y, MouseButtons.LEFT);
  });
  await testSetup.renderOnce();
};

const handled = (): boolean => true;

describe("MarkdownView table links", () => {
  test("clicking a link in a header cell activates it and does not select the row", async () => {
    const result = await renderTable(
      "| [Plan](plan.md) | Status |\n| --- | --- |\n| draft | open |",
      60,
      handled
    );

    await click(locate("Plan"));
    expect(result.activated).toEqual(["plan.md"]);
    expect(result.selected).toEqual([]);
  });

  test("a cell with two links activates the link under the pointer", async () => {
    const result = await renderTable(
      "| Links |\n| --- |\n| [Alpha](a.md) and **[Beta](nested/b.md)** |",
      60,
      handled
    );

    const alpha = locate("Alpha");
    await click({ x: alpha.x + 4, y: alpha.y });
    await click(locate("Beta"));
    const and = locate(" and ");
    await click({ x: and.x + 1, y: and.y });
    expect(result.activated).toEqual(["a.md", "nested/b.md"]);
  });

  test("a link on a wrapped line of a cell maps to the right chunk", async () => {
    const result = await renderTable(
      "| Name | Notes |\n| --- | --- |\n| row | several plain words come first then [Target](target.md) |",
      34,
      handled
    );

    const first = locate("several");
    const target = locate("Target", first.y);
    expect(target.y).toBeGreaterThan(first.y);
    await click(target);
    // The plain words on the first visual line of the same cell do nothing.
    await click(first);
    expect(result.activated).toEqual(["target.md"]);
  });

  test("clicking a cell without a link does not call the handler", async () => {
    const result = await renderTable(
      "| Name | Link |\n| --- | --- |\n| plain | [Doc](doc.md) |",
      60,
      handled
    );

    await click(locate("plain"));
    expect(result.activated).toEqual([]);
    expect(result.selected).toHaveLength(1);
  });

  test("a handler that does not return true keeps the row click", async () => {
    const result = await renderTable(
      "| Link |\n| --- |\n| [External](https://example.com) |",
      60,
      () => false
    );

    await click(locate("External"));
    expect(result.activated).toEqual(["https://example.com"]);
    expect(result.selected).toHaveLength(1);
  });

  test("without a handler a table link click only selects the row", async () => {
    const result = await renderTable("| Link |\n| --- |\n| [Doc](doc.md) |", 60);
    await click(locate("Doc"));
    expect(result.activated).toEqual([]);
    expect(result.selected).toHaveLength(1);
  });
});

describe("tableLinkMouseHandler", () => {
  test("returns no mouse handler when there is no link handler", () => {
    expect(tableLinkMouseHandler([])).toBeUndefined();
    expect(tableLinkMouseHandler([], handled)).toBeFunction();
  });
});
