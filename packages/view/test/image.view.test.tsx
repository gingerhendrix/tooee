import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { ImageRenderable } from "@opentui/core";
import type { Renderable } from "@opentui/core";
import type { ImageLoader } from "@tooee/renderers";
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

const imageLoads = function imageLoads(node: Renderable): Promise<void>[] {
  const pending = node instanceof ImageRenderable && node.loadPromise ? [node.loadPromise] : [];

  return [...pending, ...node.getChildren().flatMap(imageLoads)];
};

const renderProvider = async function renderProvider(
  provider: ContentProvider,
  size: TerminalSize = DEFAULT_SIZE,
  imageLoaders?: readonly ImageLoader[]
) {
  testSetup = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} imageLoaders={imageLoaders} />
    </TooeeProvider>,
    size
  );
  await testSetup.renderOnce();

  // A loader converts the source before the image element mounts.
  if (imageLoaders !== undefined) {
    await act(async () => {
      await Bun.sleep(20);
    });
    await testSetup.renderOnce();
  }

  // Decode completion, rather than elapsed time, makes the next paint meaningful.
  const pending = imageLoads(testSetup.renderer.root);
  expect(pending.length).toBeGreaterThan(0);
  await act(async () => {
    await Promise.all(pending);
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

/** Loader for `.svg` sources that returns a PNG at twice the intrinsic size. */
const doubleDensityLoader = function doubleDensityLoader(
  width: number,
  height: number
): ImageLoader {
  return {
    load: async () => {
      await Promise.resolve();

      return { data: solidPng(width * 2, height * 2), height, width };
    },
    matches: (source) => source.endsWith(".svg"),
    name: "svg",
  };
};

describe("View images with a loader", () => {
  test("draws a loaded image at its intrinsic size, not its raster size", async () => {
    const frame = await renderProvider(
      {
        format: "image",
        load: () => ({ format: "image", src: "/virtual/diagram.svg", title: "diagram.svg" }),
      },
      DEFAULT_SIZE,
      [doubleDensityLoader(90, 72)]
    );

    expect(drawnImageSize(frame)).toEqual({ cols: 10, rows: 4 });
  });

  test("reports a loader failure", async () => {
    const failing: ImageLoader = {
      load: async () => {
        await Promise.resolve();

        throw new Error("bad svg");
      },
      matches: (source) => source.endsWith(".svg"),
      name: "svg",
    };

    testSetup = await testRender(
      <TooeeProvider>
        <View
          contentProvider={{
            format: "image",
            load: () => ({ format: "image", src: "/virtual/bad.svg", title: "bad.svg" }),
          }}
          imageLoaders={[failing]}
        />
      </TooeeProvider>,
      DEFAULT_SIZE
    );
    await testSetup.renderOnce();
    await act(async () => {
      await Bun.sleep(20);
    });
    await testSetup.renderOnce();

    expect(testSetup.captureCharFrame()).toContain("Image failed to load: /virtual/bad.svg");
  });
});
