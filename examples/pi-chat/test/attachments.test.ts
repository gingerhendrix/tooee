import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  MAX_TEXT_BYTES,
  attachmentRefs,
  loadAttachments,
  promptWithFiles,
} from "../attachments.js";
import { PNG_BASE64 } from "./fixtures.js";

describe("attachmentRefs", () => {
  test("finds words that start with @, once each, in order", () => {
    expect(attachmentRefs("compare @a.png and @src/b.ts then @a.png")).toEqual([
      "a.png",
      "src/b.ts",
    ]);
  });

  test("skips an @ inside a word and words without @", () => {
    expect(attachmentRefs("mail me@x.png and read a.png")).toEqual([]);
  });
});

describe("loadAttachments", () => {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "pi-chat-attachments-"));
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
  });

  test("reads an image as base64 with its detected type", async () => {
    writeFileSync(path.join(dir, "dot.png"), Buffer.from(PNG_BASE64, "base64"));

    expect(await loadAttachments("what is @dot.png", dir)).toEqual({
      files: [],
      images: [{ data: PNG_BASE64, mimeType: "image/png", type: "image" }],
      ok: true,
    });
  });

  test("reads a text file without its byte order mark", async () => {
    mkdirSync(path.join(dir, "notes"));
    writeFileSync(path.join(dir, "notes/todo.md"), "﻿# Todo\n- one\n");

    expect(await loadAttachments("sum up @notes/todo.md", dir)).toEqual({
      files: [{ ref: "notes/todo.md", text: "# Todo\n- one\n" }],
      images: [],
      ok: true,
    });
  });

  test("an @ word that names no file stays plain text", async () => {
    mkdirSync(path.join(dir, "src"));

    expect(await loadAttachments("thanks @gareth, see @src", dir)).toEqual({
      files: [],
      images: [],
      ok: true,
    });
  });

  test("a missing image or a fake image fails with a message", async () => {
    writeFileSync(path.join(dir, "fake.png"), "not an image");

    const missing = await loadAttachments("@gone.png", dir);
    const fake = await loadAttachments("@fake.png", dir);

    expect(missing.ok ? "" : missing.message).toContain("Cannot attach @gone.png");
    expect(fake.ok ? "" : fake.message).toContain("not a PNG, JPEG, GIF, or WebP image");
  });

  test("a binary file or a text file over the limit fails with a message", async () => {
    writeFileSync(path.join(dir, "blob.bin"), Buffer.from([1, 0, 2]));
    writeFileSync(path.join(dir, "big.txt"), "x".repeat(MAX_TEXT_BYTES + 1));

    const binary = await loadAttachments("@blob.bin", dir);
    const big = await loadAttachments("@big.txt", dir);

    expect(binary.ok ? "" : binary.message).toContain("not a text file");
    expect(big.ok ? "" : big.message).toContain("larger than 256 KB");
  });

  test("a prompt without references attaches nothing", async () => {
    expect(await loadAttachments("hello", dir)).toEqual({ files: [], images: [], ok: true });
  });
});

describe("promptWithFiles", () => {
  test("puts one file block for each text file before the typed text", () => {
    const prompt = promptWithFiles("explain @a.ts", [{ ref: "a.ts", text: "let a = 1;" }]);

    expect(prompt).toBe('<file name="a.ts">\nlet a = 1;\n</file>\nexplain @a.ts');
  });

  test("leaves the text alone when no text file is attached", () => {
    expect(promptWithFiles("hello", [])).toBe("hello");
  });
});
