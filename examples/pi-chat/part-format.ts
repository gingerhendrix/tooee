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

/** For example `[image png · 12.3 KB]`. Terminals here cannot draw the pixels. */
export const imageLabel = function imageLabel(image: ImagePart): string {
  const format = image.mimeType.replace(/^image\//u, "");

  return `[image ${format} · ${formatBytes(image.bytes)}]`;
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
