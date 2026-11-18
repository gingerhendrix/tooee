import { describe, test, expect, afterEach } from "bun:test";

import type { Session } from "tuistory";

import { launchView } from "./helpers.js";

let session: Session;

afterEach(() => {
  try {
    session?.close();
  } catch {
    // The session may already have exited or closed.
  }
});

describe("SVG rendering in the tooee CLI", () => {
  test("opens an SVG file as an image", async () => {
    session = await launchView("diagram.svg");
    const text = await session.text();

    expect(text).toContain("Format: image");
    expect(text).not.toContain("<svg");
    expect(text).not.toContain("Image failed to load");
  }, 20_000);

  test("draws an SVG image in Markdown", async () => {
    session = await launchView("svg-image.md");
    await session.waitForText("Text after the image.", { timeout: 10_000 });

    // The loader rasterizes the SVG after the first paint.
    let text = await session.text();

    for (let attempt = 0; attempt < 50 && text.includes("Loading image"); attempt += 1) {
      // oxlint-disable-next-line no-await-in-loop -- poll the terminal until the image loads
      await Bun.sleep(100);
      // oxlint-disable-next-line no-await-in-loop -- poll the terminal until the image loads
      text = await session.text();
    }

    expect(text).not.toContain("Image failed to load");
    expect(text).not.toContain("Loading image: Diagram");
  }, 20_000);
});
