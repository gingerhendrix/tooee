import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { solidPng, testRender } from "@tooee/test-support";
import { ThemeSwitcherProvider } from "@tooee/themes";
import { act } from "react";

import type { ImageLoader } from "../src/image-loaders.js";
import { MarkdownView } from "../src/markdown-view.js";

let testSetup: Awaited<ReturnType<typeof testRender>>;

afterEach(() => {
  testSetup?.renderer.destroy();
});

/** Directory of solid PNGs, keyed by file name. Sizes are in pixels. */
const imageDir = function imageDir(images: Record<string, [number, number]>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "tooee-md-images-"));

  for (const [name, [width, height]] of Object.entries(images)) {
    writeFileSync(path.join(dir, name), solidPng(width, height));
  }

  return dir;
};

/**
 * Render Markdown with images and return the drawn image size in cells. The
 * test renderer has no pixel resolution, so cells are 9 x 18 pixels and
 * images draw as half blocks.
 */
const renderImage = async function renderImage(
  markdown: string,
  dir: string,
  size: { width: number; height: number },
  imageLoaders?: readonly ImageLoader[]
): Promise<{ cols: number; rows: number }> {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <MarkdownView
        content={markdown}
        imageBasePath={dir}
        imageLoaders={imageLoaders}
        showLineNumbers={false}
      />
    </ThemeSwitcherProvider>,
    size
  );
  await testSetup.renderOnce();
  await act(async () => {
    await Bun.sleep(50);
  });
  await testSetup.renderOnce();

  const imageLines = testSetup
    .captureCharFrame()
    .split("\n")
    .filter((line) => line.includes("█"));

  return {
    cols: Math.max(0, ...imageLines.map((line) => line.split("█").length - 1)),
    rows: imageLines.length,
  };
};

describe("Markdown image size", () => {
  test("draws a small image at its pixel size", async () => {
    const dir = imageDir({ "small.png": [90, 72] });

    expect(await renderImage("![small](small.png)", dir, { height: 30, width: 60 })).toEqual({
      cols: 10,
      rows: 4,
    });
  });

  test("shrinks a wide image to the paragraph width", async () => {
    const dir = imageDir({ "wide.png": [2000, 400] });
    const drawn = await renderImage("![wide](wide.png)", dir, { height: 30, width: 60 });

    expect(drawn.cols).toBeLessThanOrEqual(56);
    expect(drawn.cols).toBeGreaterThan(48);
    expect(drawn.rows).toBe(5);
  });

  test("shrinks a tall image to the terminal height less the padding", async () => {
    const dir = imageDir({ "tall.png": [180, 1800] });
    const drawn = await renderImage("![tall](tall.png)", dir, { height: 24, width: 80 });

    // 100 natural rows shrink to 24 - 6 rows, and the width follows the ratio.
    expect(drawn.rows).toBe(18);
    expect(drawn.cols).toBe(4);
  });
});

/**
 * Loader for `.vec` sources, a stand-in for SVG. It returns a PNG at twice
 * the intrinsic size, as the SVG loader does, and records each source.
 */
const vectorLoader = function vectorLoader(
  intrinsic: { width: number; height: number },
  requested: string[] = []
): ImageLoader {
  return {
    load: async (source) => {
      requested.push(source);
      await Promise.resolve();

      if (source.includes("broken")) {
        throw new Error("cannot parse");
      }

      return {
        data: solidPng(intrinsic.width * 2, intrinsic.height * 2),
        height: intrinsic.height,
        width: intrinsic.width,
      };
    },
    matches: (source) => source.endsWith(".vec") || source.startsWith("data:image/vec"),
    name: "vec",
  };
};

describe("Markdown images with a loader", () => {
  test("sizes the box from the intrinsic size, not the raster size", async () => {
    const requested: string[] = [];
    const dir = imageDir({});
    const loader = vectorLoader({ height: 72, width: 90 }, requested);

    const drawn = await renderImage("![vector](diagram.vec)", dir, { height: 30, width: 60 }, [
      loader,
    ]);

    // 90 x 72 CSS pixels in 9 x 18 pixel cells, as for a 90 x 72 PNG.
    expect(drawn).toEqual({ cols: 10, rows: 4 });
    expect(requested).toEqual([path.join(dir, "diagram.vec")]);
  });

  test("loads Obsidian embeds and data URIs through the loader", async () => {
    const requested: string[] = [];
    const dir = imageDir({});
    const loader = vectorLoader({ height: 36, width: 45 }, requested);

    await renderImage(
      "![[embed.vec]]\n\n![inline](data:image/vec,abc)",
      dir,
      { height: 30, width: 60 },
      [loader]
    );

    expect(requested).toEqual([path.join(dir, "embed.vec"), "data:image/vec,abc"]);
  });

  test("reports a loader failure", async () => {
    const dir = imageDir({});

    await renderImage("![Broken](broken.vec)", dir, { height: 30, width: 60 }, [
      vectorLoader({ height: 10, width: 10 }),
    ]);

    expect(testSetup.captureCharFrame()).toContain("Image failed to load: Broken");
  });

  test("leaves sources that no loader matches to the image element", async () => {
    const requested: string[] = [];
    const dir = imageDir({ "small.png": [90, 72] });

    const drawn = await renderImage("![small](small.png)", dir, { height: 30, width: 60 }, [
      vectorLoader({ height: 1, width: 1 }, requested),
    ]);

    expect(drawn).toEqual({ cols: 10, rows: 4 });
    expect(requested).toEqual([]);
  });
});
