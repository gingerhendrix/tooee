/**
 * Image attachments for a prompt. A word like `@shots/a.png` (an `@` and a
 * path with an image extension) attaches that file. The prompt text keeps
 * the reference. Pi checks the image type and resizes the image itself.
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { detectSupportedImageMimeTypeFromFile } from "@earendil-works/pi-coding-agent";

import type { PiImageContent } from "./content-parts.js";

const IMAGE_REF = /(?:^|\s)@(?<ref>\S+\.(?:png|jpe?g|gif|webp))(?=\s|$)/giu;

export type AttachmentResult =
  | { ok: true; images: PiImageContent[] }
  | { ok: false; message: string };

/** The image paths that the prompt names with `@`, in order, without repeats. */
export const imageRefs = function imageRefs(text: string): string[] {
  return [...new Set([...text.matchAll(IMAGE_REF)].flatMap((match) => match.groups?.ref ?? []))];
};

export const resolveImagePath = function resolveImagePath(ref: string, cwd: string): string {
  return ref.startsWith("~/") ? path.join(homedir(), ref.slice(2)) : path.resolve(cwd, ref);
};

const detectMimeType = async function detectMimeType(file: string): Promise<string | null> {
  try {
    return await detectSupportedImageMimeTypeFromFile(file);
  } catch {
    return null;
  }
};

type LoadedImage = { ok: true; image: PiImageContent } | { ok: false; message: string };

const loadImage = async function loadImage(ref: string, cwd: string): Promise<LoadedImage> {
  const file = resolveImagePath(ref, cwd);
  const mimeType = await detectMimeType(file);

  if (mimeType === null) {
    return {
      message: `Cannot attach @${ref}: the file does not exist or is not a PNG, JPEG, GIF, or WebP image.`,
      ok: false,
    };
  }

  const bytes = await readFile(file);

  return { image: { data: bytes.toString("base64"), mimeType, type: "image" }, ok: true };
};

/**
 * A missing or unsupported file comes back as `{ ok: false }`. A read error
 * on a detected image still rejects.
 */
export const loadImageAttachments = async function loadImageAttachments(
  text: string,
  cwd: string = process.cwd()
): Promise<AttachmentResult> {
  const loaded = await Promise.all(imageRefs(text).map(async (ref) => await loadImage(ref, cwd)));
  const images: PiImageContent[] = [];

  for (const item of loaded) {
    if (!item.ok) {
      return item;
    }

    images.push(item.image);
  }

  return { images, ok: true };
};
