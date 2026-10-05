import { getPlainText } from "@tooee/renderers";
import type { FlatBlock } from "@tooee/renderers";

import { headingToken } from "../folds/markdown-heading-folds.js";

/** One heading in a document outline. */
export interface OutlineEntry {
  /** The heading's index in the full row array, the same key folds use. */
  row: number;
  /** Heading level, 1 for `#`. */
  depth: number;
  /** Indent level in the outline: depth relative to the shallowest heading. */
  level: number;
  /** Unstyled heading text. */
  text: string;
}

/**
 * The headings of flattened Markdown blocks, in document order. Levels start
 * at 0 for the shallowest heading in the document, so a document that starts
 * at `##` is not indented.
 */
export const markdownOutline = function markdownOutline(
  blocks: readonly FlatBlock[]
): OutlineEntry[] {
  const headings = blocks.flatMap((block, row) => {
    const heading = headingToken(block);
    return heading === null
      ? []
      : [{ depth: heading.depth, row, text: getPlainText(heading.tokens).trim() }];
  });
  const minDepth = Math.min(...headings.map((heading) => heading.depth));
  return headings.map((heading) => ({ ...heading, level: heading.depth - minDepth }));
};

/**
 * Index of the entry for the heading that contains `row`: the last heading at
 * or before it. Returns `-1` before the first heading or for an empty outline.
 */
export const outlineIndexAt = function outlineIndexAt(
  entries: readonly OutlineEntry[],
  row: number
): number {
  return entries.findLastIndex((entry) => entry.row <= row);
};
