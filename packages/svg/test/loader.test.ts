import { describe, expect, test } from "bun:test";
import path from "node:path";

import { createSvgImageLoader } from "../src/loader.js";

const BADGE = path.join(import.meta.dir, "fixtures", "badge.svg");

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

/** Width and height from the IHDR chunk of a PNG. */
const pngSize = function pngSize(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);

  return { height: view.getUint32(20), width: view.getUint32(16) };
};

/** The rejection message of `promise`, or `resolved` when it resolves. */
const rejection = async function rejection(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  return "resolved";
};

const load = async function load(
  source: string,
  options: Parameters<typeof createSvgImageLoader>[0] = {}
) {
  return await createSvgImageLoader(options).load(source, {
    signal: new AbortController().signal,
  });
};

describe("createSvgImageLoader", () => {
  test("matches SVG sources only", () => {
    const loader = createSvgImageLoader();

    expect(loader.name).toBe("svg");
    expect(loader.matches("/a/b.svg")).toBe(true);
    expect(loader.matches("/a/b.png")).toBe(false);
  });

  test("reports the CSS size and rasterizes at twice that size", async () => {
    const image = await load(BADGE);

    expect(image.data.subarray(0, 4)).toEqual(new Uint8Array(PNG_SIGNATURE));
    expect({ height: image.height, width: image.width }).toEqual({ height: 60, width: 120 });
    expect(pngSize(image.data)).toEqual({ height: 120, width: 240 });
  });

  test("keeps the CSS size when the scale changes", async () => {
    const image = await load(BADGE, { scale: 3 });

    expect({ height: image.height, width: image.width }).toEqual({ height: 60, width: 120 });
    expect(pngSize(image.data)).toEqual({ height: 180, width: 360 });
  });

  test("lowers the scale to stay under the pixel cap", async () => {
    const image = await load(BADGE, { maxPixels: 120 * 60 });

    expect({ height: image.height, width: image.width }).toEqual({ height: 60, width: 120 });
    expect(pngSize(image.data)).toEqual({ height: 60, width: 120 });
  });

  test("loads data URIs", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="20"/>';
    const image = await load(`data:image/svg+xml,${encodeURIComponent(svg)}`);

    expect({ height: image.height, width: image.width }).toEqual({ height: 20, width: 10 });
  });

  test("rejects malformed SVG", async () => {
    expect(await rejection(load("data:image/svg+xml,not%20svg"))).not.toBe("resolved");
  });

  test("rejects a missing file", async () => {
    expect(await rejection(load("/missing/diagram.svg"))).not.toBe("resolved");
  });

  test("rejects when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const loading = createSvgImageLoader().load(BADGE, { signal: controller.signal });

    expect(await rejection(loading)).not.toBe("resolved");
  });
});
