import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { TooeeProvider } from "@tooee/shell";
import { solidPng, testRender } from "@tooee/test-support";
import { act } from "react";

import type { ContentProvider } from "../src/types.js";
import { View } from "../src/view.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

interface TerminalSize {
  width: number;
  height: number;
}

interface CellSize {
  cols: number;
  rows: number;
}

const DEFAULT_SIZE: TerminalSize = { height: 60, width: 80 };

const renderProvider = async function renderProvider(
  provider: ContentProvider,
  size: TerminalSize = DEFAULT_SIZE
) {
  testSetup = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} />
    </TooeeProvider>,
    size
  );
  await testSetup.renderOnce();
  await act(async () => {
    await Bun.sleep(50);
  });
  await testSetup.renderOnce();

  return testSetup.captureCharFrame();
};

const pngFile = function pngFile(name: string, width: number, height: number): string {
  const file = path.join(mkdtempSync(path.join(tmpdir(), "tooee-view-image-")), name);
  writeFileSync(file, solidPng(width, height));

  return file;
};

/** Image size in cells, from the half blocks a solid PNG draws in the test renderer. */
const drawnImageSize = function drawnImageSize(frame: string): CellSize {
  const lines = frame.split("\n").filter((line) => line.includes("█"));

  return {
    cols: Math.max(0, ...lines.map((line) => line.split("█").length - 1)),
    rows: lines.length,
  };
};

describe("View images", () => {
  test("renders native image content and reports load failures", async () => {
    const frame = await renderProvider({
      format: "image",
      load: () => ({ format: "image", src: "/missing/cover.png", title: "cover.png" }),
    });

    expect(frame).toContain("cover.png");
    expect(frame).toContain("Image failed to load: /missing/cover.png");
  });

  test("recognizes standard and Obsidian Markdown image embeds", async () => {
    const frame = await renderProvider({
      format: "markdown",
      load: () => ({
        format: "markdown",
        imageBasePath: "/missing",
        markdown: "![Standard](standard.png)\n\n![[obsidian.webp|20x8]]",
      }),
    });

    expect(frame).toContain("Image failed to load: Standard");
    expect(frame).toContain("Image failed to load: obsidian.webp");
    expect(frame).not.toContain("![[obsidian.webp|20x8]]");
  });

  test("draws a small image file at its pixel size", async () => {
    const src = pngFile("small.png", 90, 72);

    const frame = await renderProvider({
      format: "image",
      load: () => ({ format: "image", src, title: "small.png" }),
    });

    // 9 x 18 pixel cells: 10 columns by 4 rows.
    expect(drawnImageSize(frame)).toEqual({ cols: 10, rows: 4 });
  });

  test("shrinks a large image file to the content area", async () => {
    const src = pngFile("large.png", 1800, 1800);

    const frame = await renderProvider(
      {
        format: "image",
        load: () => ({ format: "image", src, title: "large.png" }),
      },
      { height: 30, width: 80 }
    );

    const drawn = drawnImageSize(frame);

    expect(drawn.rows).toBeGreaterThan(15);
    expect(drawn.rows).toBeLessThan(30);
    expect(drawn.cols).toBe(drawn.rows * 2);
  });
});
