import path from "node:path";
import { describe, expect, test } from "bun:test";
import { createFileProvider } from "../src/default-provider.js";

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
