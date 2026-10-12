/**
 * File attachments for a prompt. A word like `@shots/a.png` or `@src/app.ts`
 * (an `@` at the start of a word, then a path) attaches that file.
 *
 * - An image (PNG, JPEG, GIF, WebP) goes to Pi as image content. Pi checks
 *   the type and resizes the image itself.
 * - A text file goes into the prompt as a `<file name="…">` block, the same
 *   form the Pi CLI uses for `@file` arguments.
 *
 * A word that names no file stays plain text, so `@gareth` still works. A
 * word with an image extension must name a real image.
 */

import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { detectSupportedImageMimeTypeFromFile } from "@earendil-works/pi-coding-agent";

import type { PiImageContent } from "./content-parts.js";

const FILE_REF = /(?:^|\s)@(?<ref>\S+)/gu;

const IMAGE_EXTENSION = /\.(?:png|jpe?g|gif|webp)$/iu;

/** Larger text files fail, so one prompt cannot fill the model context by mistake. */
export const MAX_TEXT_BYTES = 256 * 1024;

export interface TextAttachment {
  /** The path as the prompt names it. */
  ref: string;
  text: string;
}

export type AttachmentResult =
  | { ok: true; images: PiImageContent[]; files: TextAttachment[] }
  | { ok: false; message: string };

/** The paths that the prompt names with `@`, in order, without repeats. */
export const attachmentRefs = function attachmentRefs(text: string): string[] {
  return [...new Set([...text.matchAll(FILE_REF)].flatMap((match) => match.groups?.ref ?? []))];
};

export const resolveAttachmentPath = function resolveAttachmentPath(
  ref: string,
  cwd: string
): string {
  return ref.startsWith("~/") ? path.join(homedir(), ref.slice(2)) : path.resolve(cwd, ref);
};

const isFile = async function isFile(file: string): Promise<boolean> {
  try {
    const info = await stat(file);

    return info.isFile();
  } catch {
    return false;
  }
};

const detectMimeType = async function detectMimeType(file: string): Promise<string | null> {
  try {
    return await detectSupportedImageMimeTypeFromFile(file);
  } catch {
    return null;
  }
};

type Loaded =
  | { kind: "image"; image: PiImageContent }
  | { kind: "text"; file: TextAttachment }
  | { kind: "skip" }
  | { kind: "error"; message: string };

const loadText = async function loadText(ref: string, file: string): Promise<Loaded> {
  const bytes = await readFile(file);

  if (bytes.length > MAX_TEXT_BYTES) {
    return {
      kind: "error",
      message: `Cannot attach @${ref}: the file is larger than ${MAX_TEXT_BYTES / 1024} KB.`,
    };
  }

  if (bytes.includes(0)) {
    return {
      kind: "error",
      message: `Cannot attach @${ref}: it is not a text file or a PNG, JPEG, GIF, or WebP image.`,
    };
  }

  // Drop a byte order mark, as the Pi CLI does.
  const text = bytes.toString("utf-8").replace(/^﻿/u, "");

  return { file: { ref, text }, kind: "text" };
};

const loadAttachment = async function loadAttachment(ref: string, cwd: string): Promise<Loaded> {
  const file = resolveAttachmentPath(ref, cwd);
  const imageName = IMAGE_EXTENSION.test(ref);

  if (!(await isFile(file))) {
    return imageName
      ? { kind: "error", message: `Cannot attach @${ref}: the file does not exist.` }
      : { kind: "skip" };
  }

  const mimeType = await detectMimeType(file);

  if (mimeType !== null) {
    const bytes = await readFile(file);

    return { image: { data: bytes.toString("base64"), mimeType, type: "image" }, kind: "image" };
  }

  if (imageName) {
    return {
      kind: "error",
      message: `Cannot attach @${ref}: the file is not a PNG, JPEG, GIF, or WebP image.`,
    };
  }

  return await loadText(ref, file);
};

/**
 * Loads every file the prompt names. The first file that cannot attach
 * comes back as `{ ok: false }`. A read error on a file that exists still
 * rejects.
 */
export const loadAttachments = async function loadAttachments(
  text: string,
  cwd: string = process.cwd()
): Promise<AttachmentResult> {
  const loaded = await Promise.all(
    attachmentRefs(text).map(async (ref) => await loadAttachment(ref, cwd))
  );

  const images: PiImageContent[] = [];
  const files: TextAttachment[] = [];

  for (const item of loaded) {
    if (item.kind === "error") {
      return { message: item.message, ok: false };
    }

    if (item.kind === "image") {
      images.push(item.image);
    } else if (item.kind === "text") {
      files.push(item.file);
    }
  }

  return { files, images, ok: true };
};

/**
 * The prompt Pi gets: one `<file name="…">` block for each text file, then
 * the text the user typed.
 */
export const promptWithFiles = function promptWithFiles(
  text: string,
  files: readonly TextAttachment[]
): string {
  const blocks = files.map((file) => `<file name="${file.ref}">\n${file.text}\n</file>\n`);

  return `${blocks.join("")}${text}`;
};
