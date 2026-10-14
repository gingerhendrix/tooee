import type { MouseEvent, TextChunk } from "@opentui/core";

import { positionLinkMouseHandler } from "./links.js";
import type { MarkdownLinkHandler } from "./links.js";

/** The OSC 8 link URL of the chunk at a text position in one table cell. */
export const chunkLinkAt = function chunkLinkAt(
  chunks: readonly TextChunk[],
  line: number,
  offset: number
): string | null {
  let currentLine = 0;
  let column = 0;

  for (const chunk of chunks) {
    const parts = chunk.text.split("\n");

    for (const [index, part] of parts.entries()) {
      const width = Bun.stringWidth(part);

      if (currentLine === line && offset >= column && offset < column + width) {
        return chunk.link?.url ?? null;
      }

      column += width;

      if (index < parts.length - 1) {
        currentLine += 1;
        column = 0;
      }
    }
  }

  return null;
};

/**
 * Primary-click handler for one Markdown table cell. It activates the link
 * under the pointer and consumes the event only when the host handler returns
 * literal true.
 */
export const tableCellLinkMouseHandler = function tableCellLinkMouseHandler(
  chunks: readonly TextChunk[],
  onLinkActivate?: MarkdownLinkHandler
): ((event: MouseEvent) => void) | undefined {
  return positionLinkMouseHandler(
    (position) => chunkLinkAt(chunks, position.line, position.column),
    onLinkActivate
  );
};
