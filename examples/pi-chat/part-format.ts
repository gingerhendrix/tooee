/** Pure text helpers for the part views: previews, sizes, and labels. */

import type { ImagePart, ToolCallStatus } from "./content-parts.js";

export interface Preview {
  text: string;
  /** Lines left out of `text`. */
  hidden: number;
}

/**
 * Keeps at most `max` lines. `from: "end"` keeps the last lines, which suits
 * text that still streams in.
 */
export const previewLines = function previewLines(
  text: string,
  max: number,
  from: "start" | "end" = "start"
): Preview {
  const lines = text.trimEnd().split("\n");

  if (lines.length <= max) {
    return { hidden: 0, text: lines.join("\n") };
  }

  const kept = from === "start" ? lines.slice(0, max) : lines.slice(-max);

  return { hidden: lines.length - max, text: kept.join("\n") };
};

export const formatBytes = function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** For example `[image png · 12.3 KB]`. The caption above a drawn image. */
export const imageLabel = function imageLabel(
  image: Pick<ImagePart, "bytes" | "mimeType">
): string {
  const format = image.mimeType.replace(/^image\//u, "");

  return `[image ${format} · ${formatBytes(image.bytes)}]`;
};

/** The tallest image in the history, in terminal rows. */
export const IMAGE_MAX_ROWS = 12;

/** Source pixels for one terminal row, so small images stay small. */
const PIXELS_PER_ROW = 20;

/** A terminal cell is about twice as tall as it is wide. */
const CELL_ASPECT = 2;

/** An image box in terminal cells. */
export interface ImageCells {
  width: number;
  height: number;
}

/**
 * The cell box for an image: at most `maxRows` rows high, and as wide as the
 * image's aspect ratio needs. The `<image>` element centers the picture in
 * its box, so a box that matches the aspect ratio keeps the image at the left.
 */
export const imageCells = function imageCells(
  size: NonNullable<ImagePart["size"]>,
  maxRows = IMAGE_MAX_ROWS
): ImageCells {
  const height = Math.min(maxRows, Math.max(1, Math.ceil(size.height / PIXELS_PER_ROW)));
  const width = Math.max(1, Math.round((height * size.width * CELL_ASPECT) / size.height));

  return { height, width };
};

/** One-line tool arguments, cut to `max` characters. */
export const argsSummary = function argsSummary(args: string, max = 80): string {
  const line = args === "{}" ? "" : args.replaceAll(/\s+/gu, " ");

  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

export const TOOL_STATUS_LABEL: Record<ToolCallStatus, string> = {
  cancelled: "not run",
  done: "done",
  error: "failed",
  pending: "waiting",
  running: "running",
};
