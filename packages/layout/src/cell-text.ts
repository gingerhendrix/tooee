/** Cell-width text helpers shared by the title bar and the status bar. */

export type TruncateMode = "end" | "middle" | "start";

const ELLIPSIS = "…";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Terminal cell width of `text`. Wide characters count as two cells. */
export const cellWidth = function cellWidth(text: string): number {
  return Bun.stringWidth(text);
};

const graphemes = function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (part) => part.segment);
};

/** The longest run of whole graphemes from the front of `parts` that fits in `max` cells. */
const takeCells = function takeCells(parts: readonly string[], max: number): string[] {
  const taken: string[] = [];
  let used = 0;

  for (const part of parts) {
    const width = cellWidth(part);

    if (used + width > max) {
      break;
    }

    taken.push(part);
    used += width;
  }

  return taken;
};

/**
 * Shorten `text` to at most `max` cells. The ellipsis goes at the end, at the
 * start, or in the middle. A wide character never splits, so the result can be
 * one cell shorter than `max`.
 */
export const truncateCells = function truncateCells(
  text: string,
  max: number,
  mode: TruncateMode = "end"
): string {
  if (cellWidth(text) <= max) {
    return text;
  }

  if (max <= 0) {
    return "";
  }

  if (max === 1) {
    return ELLIPSIS;
  }

  const parts = graphemes(text);
  const room = max - 1;

  if (mode === "end") {
    return takeCells(parts, room).join("") + ELLIPSIS;
  }

  const reversed = parts.toReversed();

  if (mode === "start") {
    return ELLIPSIS + takeCells(reversed, room).toReversed().join("");
  }

  const head = takeCells(parts, Math.ceil(room / 2)).join("");

  const tail = takeCells(reversed, room - cellWidth(head))
    .toReversed()
    .join("");

  return head + ELLIPSIS + tail;
};
