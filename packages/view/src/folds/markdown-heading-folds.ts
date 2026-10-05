import type { FlatBlock } from "@tooee/renderers";
import type { Tokens } from "marked";

import type { FoldRange } from "./fold-model.js";

/** The Marked heading token of a flattened block, or `null` when the block is not a heading. */
export const headingToken = function headingToken(block: FlatBlock): Tokens.Heading | null {
  if (block.token.type !== "heading") {
    return null;
  }
  // SAFETY: Marked creates a Heading token for the checked "heading" discriminator.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Marked's Generic fallback prevents discriminator narrowing
  return block.token as Tokens.Heading;
};

const headingDepth = function headingDepth(block: FlatBlock): number | null {
  return headingToken(block)?.depth ?? null;
};

/**
 * Heading fold ranges over flattened Markdown blocks. A heading at depth `d`
 * folds every following block up to the next heading of depth `d` or less, or
 * the end of the document. A heading with no body yields no range. Keys are
 * the heading's block index, the same key the Markdown row adapter uses.
 */
export const markdownHeadingFoldRanges = function markdownHeadingFoldRanges(
  blocks: readonly FlatBlock[]
): FoldRange[] {
  const ranges: FoldRange[] = [];
  const open: { depth: number; start: number }[] = [];
  const close = (start: number, end: number) => {
    if (end > start) {
      ranges.push({ end, key: start, start });
    }
  };

  for (const [index, block] of blocks.entries()) {
    const depth = headingDepth(block);
    if (depth === null) {
      continue;
    }
    while (open.length > 0 && (open.at(-1)?.depth ?? 0) >= depth) {
      const finished = open.pop();
      if (finished) {
        close(finished.start, index - 1);
      }
    }
    open.push({ depth, start: index });
  }
  for (const finished of open) {
    close(finished.start, blocks.length - 1);
  }

  return ranges.toSorted((left, right) => left.start - right.start);
};
