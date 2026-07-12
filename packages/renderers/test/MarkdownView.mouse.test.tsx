import { testRender } from "../../../test/support/test-render.ts";
import { test, expect, describe, afterEach } from "bun:test";
import { act } from "react";
import { MouseButtons } from "@opentui/core/testing";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { MarkdownView } from "../src/MarkdownView.js";
import { CodeBlockChrome } from "../src/code-blocks.js";
import type { CodeBlockRenderer } from "../src/code-blocks.js";
import { useRowMouseBindings } from "./support/bindings.js";
import type { RowMouseCallbacks } from "./support/bindings.js";

const CONTENT_X = 8;

const MarkdownHarness = function MarkdownHarness({
  content,
  codeBlockRenderers,
  ...callbacks
}: RowMouseCallbacks & {
  content: string;
  codeBlockRenderers?: Record<string, CodeBlockRenderer>;
}) {
  return (
    <MarkdownView
      content={content}
      document={useRowMouseBindings(callbacks)}
      codeBlockRenderers={codeBlockRenderers}
    />
  );
};

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

describe("MarkdownView mouse interaction", () => {
  test("left-click selects the block, not the raw line (wrapped paragraph)", async () => {
    // Block 0: a long paragraph that wraps across >1 visual line.
    // Block 1: a short second paragraph.
    const md =
      "This is the first paragraph and it is intentionally long enough to wrap across " +
      "several visual lines in a narrow view.\n\nSecond paragraph.";
    const clicked: number[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownHarness content={md} onRowClick={(i) => clicked.push(i)} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 40 },
    );
    await testSetup.renderOnce();

    // First and second visual rows both belong to block 0 (the paragraph).
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 0, MouseButtons.LEFT);
    });
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 1, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(clicked).toEqual([0, 0]);
  });

  test("clicking a later block selects that block index", async () => {
    const md = "First.\n\nSecond.\n\nThird.";
    const clicked: number[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownHarness content={md} onRowClick={(i) => clicked.push(i)} />
      </ThemeSwitcherProvider>,
      { height: 20, width: 40 },
    );
    await testSetup.renderOnce();

    // Blocks: 0 "First." (y0), gap (y1), 1 "Second." (y2), gap (y3), 2 "Third." (y4)
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 0, MouseButtons.LEFT);
    });
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 2, MouseButtons.LEFT);
    });
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 4, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(clicked).toEqual([0, 1, 2]);
  });

  test("clicking inside a custom-rendered code block selects that block", async () => {
    // A custom fence renderer whose output does not stop propagation, so the
    // click still bubbles up to the row-document and selects the block.
    const chartRenderer: CodeBlockRenderer = ({ text, theme, indent }) => (
      <CodeBlockChrome theme={theme} indent={indent}>
        <text content={text} style={{ fg: theme.markdownText, height: 3 }} />
      </CodeBlockChrome>
    );
    const md = "Intro.\n\n```chart\nrow1\nrow2\nrow3\n```";
    const clicked: number[] = [];
    testSetup = await testRender(
      <ThemeSwitcherProvider>
        <MarkdownHarness
          content={md}
          codeBlockRenderers={{ chart: chartRenderer }}
          onRowClick={(i) => clicked.push(i)}
        />
      </ThemeSwitcherProvider>,
      { height: 20, width: 40 },
    );
    await testSetup.renderOnce();

    // Block 0 "Intro." at y0; block 1 is the chart block (bordered box) below it.
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 0, MouseButtons.LEFT);
    });
    await act(async () => {
      await testSetup.mockMouse.click(CONTENT_X, 4, MouseButtons.LEFT);
    });
    await testSetup.renderOnce();

    expect(clicked).toEqual([0, 1]);
  });
});
