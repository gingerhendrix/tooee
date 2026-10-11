import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { imageRefs, loadImageAttachments } from "../image-attachments.js";
import { PNG_BASE64 } from "./fixtures.js";

describe("imageRefs", () => {
  test("finds @ words with an image extension, once each", () => {
    expect(imageRefs("compare @a.png and @shots/b.JPG then @a.png")).toEqual([
      "a.png",
      "shots/b.JPG",
    ]);
  });

  test("skips emails, other files, and words without @", () => {
    expect(imageRefs("mail me@x.png, read @notes.md and a.png")).toEqual([]);
  });
});

describe("loadImageAttachments", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir !== undefined) {
      rmSync(dir, { force: true, recursive: true });
      dir = undefined;
    }
  });

  test("reads each referenced image as base64 with its detected type", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "pi-chat-images-"));
    writeFileSync(path.join(dir, "dot.png"), Buffer.from(PNG_BASE64, "base64"));

    const result = await loadImageAttachments("what is @dot.png", dir);

    expect(result).toEqual({
      images: [{ data: PNG_BASE64, mimeType: "image/png", type: "image" }],
      ok: true,
    });
  });

  test("a missing file or a file that is not an image fails with a message", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "pi-chat-images-"));
    writeFileSync(path.join(dir, "fake.png"), "not an image");

    const missing = await loadImageAttachments("@gone.png", dir);
    const fake = await loadImageAttachments("@fake.png", dir);

    expect(missing).toMatchObject({ ok: false });
    expect(fake.ok ? "" : fake.message).toContain("Cannot attach @fake.png");
  });

  test("a prompt without references attaches nothing", async () => {
    expect(await loadImageAttachments("hello")).toEqual({ images: [], ok: true });
  });
});
