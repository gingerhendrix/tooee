import { afterEach, describe, expect, test } from "bun:test";

import { TextareaRenderable } from "@opentui/core";
import type { Renderable, ScrollBoxRenderable } from "@opentui/core";
import { AppLayout } from "@tooee/layout";
import { TooeeProvider } from "@tooee/shell";
import { expectDefined, testRender } from "@tooee/test-support";
import { act, useRef } from "react";
import type { ReactNode } from "react";

import { AskEditor } from "../src/ask-editor.js";
import { AskOverlay } from "../src/ask-overlay.js";
import { AskPanel } from "../src/ask-panel.js";
import { useAskEditor } from "../src/use-ask-editor.js";

let testSetup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  testSetup?.renderer.destroy();
  testSetup = undefined;
});

const HINTS = "HINTS";

const PROMPT = "PROMPT";

const longLines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`).join("\n");

const wrappedParagraphs = Array.from({ length: 12 }, () =>
  "lorem ipsum dolor sit amet consectetur ".repeat(5).trim()
).join("\n\n");

const CONTENT_WORDS = new Set(["amet", "consectetur", "dolor", "ipsum", "line", "lorem", "sit"]);

const SIZES = [
  [80, 24],
  [100, 30],
  [120, 40],
  [200, 60],
] as const;

const CONTENT = [
  ["long lines", longLines],
  ["wrapped paragraphs", wrappedParagraphs],
] as const;

const hints = () => HINTS;

/** The ptui askWithModel composition: a fixed 2-row prompt and a margin wrapper. */
const ComposedPanel = function ComposedPanel({ value }: { value: string }): ReactNode {
  const { editor } = useAskEditor({
    commandScope: "layout-test",
    defaultValue: value,
    multiline: true,
    onCancel: () => {},
    onSubmit: () => {},
    submitKey: "shift+enter",
  });

  return (
    <AskPanel
      title="TITLE"
      prompt={
        <box height={2} marginX={3} paddingTop={1}>
          <text content={PROMPT} />
        </box>
      }
      multiline
      hints={hints}
      inset={{ bottom: "15%", left: "15%", right: "15%", top: "15%" }}
    >
      <box flexDirection="column" style={{ flexGrow: 1, marginTop: 1, marginX: 2, paddingX: 1 }}>
        <AskEditor editor={editor} />
      </box>
    </AskPanel>
  );
};

/** The standalone path wraps the panel in AppLayout's scrollbox. */
const StandalonePanel = function StandalonePanel({ value }: { value: string }): ReactNode {
  const scrollRef = useRef<ScrollBoxRenderable | null>(null);

  return (
    <AppLayout
      titleBar={{ title: "APP" }}
      statusBar={{ items: [] }}
      scroll={{ focused: false, ref: scrollRef }}
    >
      <ComposedPanel value={value} />
    </AppLayout>
  );
};

const overlay = function overlay(value: string): ReactNode {
  return (
    <AskOverlay
      title="TITLE"
      prompt={PROMPT}
      multiline
      defaultValue={value}
      hints={hints}
      onSubmit={() => {}}
      onCancel={() => {}}
    />
  );
};

const findTextarea = function findTextarea(node: Renderable): TextareaRenderable | undefined {
  if (node instanceof TextareaRenderable) {
    return node;
  }

  for (const child of node.getChildren()) {
    const found = findTextarea(child);

    if (found) {
      return found;
    }
  }

  return undefined;
};

const renderAsk = async function renderAsk(node: ReactNode, width: number, height: number) {
  const setup = await testRender(<TooeeProvider initialMode="insert">{node}</TooeeProvider>, {
    height,
    kittyKeyboard: true,
    width,
  });

  testSetup = setup;
  await act(async () => {
    await setup.renderOnce();
  });
  await setup.renderOnce();

  return setup;
};

const expectEditorInsidePanel = async function expectEditorInsidePanel(
  node: ReactNode,
  width: number,
  height: number
) {
  const setup = await renderAsk(node, width, height);
  const rows = setup.captureCharFrame().split("\n");
  const top = rows.findIndex((row) => row.includes("┌"));
  const bottom = rows.findLastIndex((row) => row.includes("┘"));
  const body = rows.slice(top + 1, bottom);

  // The bottom border is whole: no editor text or scrollbar glyph on it.
  expect(rows[bottom]?.trim()).toMatch(/^└─+┘$/u);
  expect(rows.findIndex((row) => row.includes(HINTS))).toBe(bottom - 1);
  expect(body.some((row) => row.includes(PROMPT))).toBe(true);

  const textarea = expectDefined(findTextarea(setup.renderer.root));
  const row = expectDefined(textarea.parent);
  expect(textarea.y + textarea.height).toBeLessThanOrEqual(row.y + row.height);
  expect(textarea.y + textarea.height).toBeLessThanOrEqual(bottom - 1);
  // The scrollbar column sits beside the textarea, not over its last column.
  expect(textarea.x + textarea.width).toBeLessThanOrEqual(row.x + row.width - 1);

  // Soft-wrapped words stay whole.
  const words = body.flatMap((line) => line.replaceAll(/[│░█✕]/gu, " ").split(/\s+/u));
  const cut = words.filter((word) => /^[a-z]+$/u.test(word) && !CONTENT_WORDS.has(word));
  expect(cut).toEqual([]);
};

describe("ask editor stays inside the panel border", () => {
  for (const [width, height] of SIZES) {
    for (const [label, value] of CONTENT) {
      test(`AskOverlay with title and prompt, ${label}, ${width}x${height}`, async () => {
        await expectEditorInsidePanel(overlay(value), width, height);
      });

      test(`AskPanel in AppLayout with a fixed prompt, ${label}, ${width}x${height}`, async () => {
        await expectEditorInsidePanel(<StandalonePanel value={value} />, width, height);
      });
    }
  }
});
