import { afterEach, describe, expect, test } from "bun:test";

import { MarkdownView } from "@tooee/renderers";
import { testRender } from "@tooee/test-support";
import { ThemeProvider } from "@tooee/themes";

import { createPeleMermaidRenderer } from "../src/renderer.js";
import type { PeleMermaidRendererOptions } from "../src/renderer.js";

let testSetup: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  testSetup?.renderer.destroy();
  testSetup = undefined;
});

const FLOWCHART = "flowchart LR\n  A[Start] --> B[Done]";

// beautiful-mermaid draws this; Pele rejects the unquoted parentheses.
const PELE_REJECTS = "flowchart LR\n  A[Server] -->|SSE (Shapes)| B[Client]";

// Pele draws pie charts; beautiful-mermaid does not.
const PIE = 'pie title Fences\n  "flowchart" : 9\n  "sequence" : 1';

// Half-block glyphs that OpenTUI draws for a `blocks` image.
const BLOCK_GLYPHS = /[▀▄▌▐▙▛▜▟█]/u;

const renderFence = async function renderFence(
  source: string,
  options: PeleMermaidRendererOptions
): Promise<string> {
  const markdown = `# Diagram\n\n\`\`\`mermaid\n${source}\n\`\`\`\n`;

  testSetup = await testRender(
    <ThemeProvider name="github" mode="dark">
      <MarkdownView
        content={markdown}
        codeBlockRenderers={{ mermaid: createPeleMermaidRenderer(options) }}
      />
    </ThemeProvider>,
    { height: 30, width: 80 }
  );
  await testSetup.renderOnce();

  return testSetup.captureCharFrame();
};

/** Frame rows that hold half-block image glyphs. */
const imageRows = function imageRows(frame: string): number {
  return frame.split("\n").filter((line) => BLOCK_GLYPHS.test(line)).length;
};

describe("createPeleMermaidRenderer", () => {
  test("draws a Pele image by default when images are available", async () => {
    const frame = await renderFence(FLOWCHART, { protocol: "blocks" });

    expect(frame).toMatch(BLOCK_GLYPHS);
    expect(frame).not.toContain("Start");
    expect(frame).not.toContain("flowchart LR");
  });

  test("falls back to ASCII when the terminal has no pixel image support", async () => {
    // The test renderer reports no capabilities, so `auto` resolves to blocks.
    const frame = await renderFence(FLOWCHART, { protocol: "auto" });

    expect(frame).toContain("Start");
    expect(frame).toContain("Done");
    expect(frame).not.toMatch(BLOCK_GLYPHS);
  });

  test("falls back to ASCII when Pele rejects the fence", async () => {
    const frame = await renderFence(PELE_REJECTS, { protocol: "blocks" });

    expect(frame).toContain("Server");
    expect(frame).not.toContain("flowchart LR");
  });

  test("pele-only shows the source when Pele rejects the fence", async () => {
    const frame = await renderFence(PELE_REJECTS, { protocol: "blocks", strategy: "pele-only" });

    expect(frame).toContain("flowchart LR");
  });

  test("pele-only shows the source when images are not available", async () => {
    const frame = await renderFence(FLOWCHART, { protocol: "auto", strategy: "pele-only" });

    expect(frame).toContain("flowchart LR");
  });

  test("ascii-then-pele keeps ASCII for a fence beautiful-mermaid draws", async () => {
    const frame = await renderFence(FLOWCHART, { protocol: "blocks", strategy: "ascii-then-pele" });

    expect(frame).toContain("Start");
    expect(frame).not.toMatch(BLOCK_GLYPHS);
  });

  test("ascii-then-pele uses Pele for a diagram type ASCII cannot draw", async () => {
    const frame = await renderFence(PIE, { protocol: "blocks", strategy: "ascii-then-pele" });

    expect(frame).toMatch(BLOCK_GLYPHS);
    expect(frame).not.toContain("pie title");
  });

  test("draws a diagram larger than its SVG size by default", async () => {
    const natural = imageRows(await renderFence(FLOWCHART, { protocol: "blocks", zoom: 1 }));
    testSetup?.renderer.destroy();
    const zoomed = imageRows(await renderFence(FLOWCHART, { protocol: "blocks" }));

    expect(natural).toBeGreaterThan(0);
    expect(zoomed).toBeGreaterThan(natural);
  });

  test("zoom: 2 draws twice the rows of zoom: 1", async () => {
    const natural = imageRows(await renderFence(FLOWCHART, { protocol: "blocks", zoom: 1 }));
    testSetup?.renderer.destroy();
    const doubled = imageRows(await renderFence(FLOWCHART, { protocol: "blocks", zoom: 2 }));

    expect(Math.abs(doubled - natural * 2)).toBeLessThanOrEqual(1);
  });
});
