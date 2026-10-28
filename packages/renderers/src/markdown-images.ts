import path from "node:path";

import type { Token } from "marked";

import { naturalImageBox } from "./image-size.js";
import type { CellGeometry, ImageBox } from "./image-size.js";
import { narrowToken } from "./markdown/tokens.js";

const OBSIDIAN_IMAGE_EMBED = /!\[\[(?<target>[^\]|]+)(?:\|(?<display>[^\]]+))?\]\]/gu;

const IMAGE_DIMENSIONS = /^(?<width>\d+)(?:x(?<height>\d+))?$/u;

const URL_SCHEME = /^[a-z][a-z\d+.-]*:/iu;

export interface MarkdownImageEmbed {
  source: string;
  alt?: string;
  width?: number;
  height?: number;
}

export type MarkdownInlineSegment =
  | { type: "text"; tokens: Token[] }
  | ({ type: "image" } & MarkdownImageEmbed);

const obsidianEmbed = function obsidianEmbed(
  target: string,
  display: string | undefined
): MarkdownImageEmbed {
  const source = target.trim();
  const dimensions = display?.trim().match(IMAGE_DIMENSIONS);

  if (dimensions?.groups?.width !== undefined) {
    return {
      height: dimensions.groups.height === undefined ? undefined : Number(dimensions.groups.height),
      source,
      width: Number(dimensions.groups.width),
    };
  }

  const alt = display?.trim();

  return { alt: alt === undefined || alt === "" ? undefined : alt, source };
};

/** Parse a complete Obsidian image embed such as `![[cover.png|40x12]]`. */
export const parseObsidianImageEmbed = function parseObsidianImageEmbed(
  value: string
): MarkdownImageEmbed | null {
  const match = /^!\[\[(?<target>[^\]|]+)(?:\|(?<display>[^\]]+))?\]\]$/u.exec(value.trim());

  if (match?.groups?.target === undefined) {
    return null;
  }

  return obsidianEmbed(match.groups.target, match.groups.display);
};

const splitTextToken = function splitTextToken(text: string): MarkdownInlineSegment[] {
  const segments: MarkdownInlineSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(OBSIDIAN_IMAGE_EMBED)) {
    const { index } = match;

    if (index > cursor) {
      segments.push({
        tokens: [
          {
            raw: text.slice(cursor, index),
            text: text.slice(cursor, index),
            type: "text",
          },
        ],
        type: "text",
      });
    }

    const target = match.groups?.target;

    if (target !== undefined) {
      segments.push({ ...obsidianEmbed(target, match.groups?.display), type: "image" });
    }

    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({
      tokens: [{ raw: text.slice(cursor), text: text.slice(cursor), type: "text" }],
      type: "text",
    });
  }

  return segments.length > 0
    ? segments
    : [{ tokens: [{ raw: text, text, type: "text" }], type: "text" }];
};

/** Split paragraph tokens into text and native-image render segments. */
export const splitMarkdownImages = function splitMarkdownImages(
  tokens: readonly Token[]
): MarkdownInlineSegment[] {
  const result: MarkdownInlineSegment[] = [];
  let pendingText: Token[] = [];

  const flushText = () => {
    if (pendingText.length > 0) {
      result.push({ tokens: pendingText, type: "text" });
      pendingText = [];
    }
  };

  for (const token of tokens) {
    const imageToken = narrowToken(token, "image");

    if (imageToken !== null) {
      flushText();
      result.push({
        alt: imageToken.text === "" ? undefined : imageToken.text,
        source: imageToken.href,
        type: "image",
      });
      continue;
    }

    const textToken = narrowToken(token, "text");

    if (textToken !== null) {
      const parts = splitTextToken(textToken.text);

      for (const part of parts) {
        if (part.type === "text") {
          pendingText.push(...part.tokens);
        } else {
          flushText();
          result.push(part);
        }
      }

      continue;
    }

    pendingText.push(token);
  }

  flushText();

  return result;
};

/** Resolve relative image links against the Markdown document directory. */
export const resolveMarkdownImageSource = function resolveMarkdownImageSource(
  source: string,
  basePath?: string
): string {
  if (path.isAbsolute(source) || URL_SCHEME.test(source)) {
    return source;
  }

  return path.resolve(basePath ?? process.cwd(), source);
};

/**
 * Cell box for a Markdown image. An embed with both an explicit width and
 * height keeps that box. Otherwise the box follows the image pixel size and
 * shrinks only to fit `maxCols` and `maxRows`. An explicit width alone sets
 * the columns, and the rows follow the image aspect ratio. Before the image
 * loads, its pixel size is unknown and the box is empty.
 */
export const markdownImageBox = function markdownImageBox(
  image: MarkdownImageEmbed,
  pixels: { width: number; height: number } | null,
  geometry: CellGeometry,
  limits: { maxCols: number; maxRows: number }
): ImageBox {
  if (image.width !== undefined && image.height !== undefined) {
    return { cols: image.width, rows: image.height };
  }

  if (pixels === null) {
    return { cols: 0, rows: 0 };
  }

  return naturalImageBox(pixels.width, pixels.height, geometry, {
    cols: image.width,
    maxCols: limits.maxCols,
    maxRows: limits.maxRows,
  });
};
