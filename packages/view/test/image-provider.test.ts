import { describe, expect, test } from "bun:test";
import path from "node:path";

import type { ImageLoader } from "@tooee/renderers";

import { createFileProvider } from "../src/default-provider.js";

const SVG_FIXTURE = path.join(import.meta.dir, "fixtures", "diagram.svg");

const svgLoader: ImageLoader = {
  load: async () => {
    await Promise.resolve();

    throw new Error("not used");
  },
  matches: (source) => source.endsWith(".svg"),
  name: "svg",
};

describe("createFileProvider image support", () => {
  test("creates image content without reading the binary file", async () => {
    const provider = createFileProvider("/images/cover.png");
    const content = await provider.load();
    expect(content).toEqual({ format: "image", src: "/images/cover.png", title: "cover.png" });
  });

  test("sets the image base path for Markdown files", async () => {
    const fixturePath = path.join(import.meta.dir, "fixtures", "image-note.md");
    const provider = createFileProvider(fixturePath);
    const content = await provider.load();
    expect(content).toMatchObject({
      format: "markdown",
      imageBasePath: path.dirname(fixturePath),
    });
  });
});

describe("createFileProvider with image loaders", () => {
  test("opens an SVG file as text when no loader is registered", async () => {
    const content = await createFileProvider(SVG_FIXTURE).load();

    expect(content).toMatchObject({ format: "text", title: "diagram.svg" });
  });

  test("opens an SVG file as an image when a loader matches it", async () => {
    const content = await createFileProvider(SVG_FIXTURE, { imageLoaders: [svgLoader] }).load();

    expect(content).toEqual({ format: "image", src: SVG_FIXTURE, title: "diagram.svg" });
  });

  test("keeps a forced renderer over a loader match", async () => {
    const content = await createFileProvider(SVG_FIXTURE, {
      imageLoaders: [svgLoader],
      renderer: "text",
    }).load();

    expect(content).toMatchObject({ format: "text" });
  });

  test("passes loaders to Markdown files without changing their format", async () => {
    const fixturePath = path.join(import.meta.dir, "fixtures", "image-note.md");
    const content = await createFileProvider(fixturePath, { imageLoaders: [svgLoader] }).load();

    expect(content).toMatchObject({ format: "markdown" });
  });
});
