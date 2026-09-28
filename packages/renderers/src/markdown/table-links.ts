import type { MouseEvent, TextChunk, TextTableContent } from "@opentui/core";

import { textTableCellAt } from "../text-table-internals.js";
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
 * Primary-click handler for a Markdown table. It activates the link under the pointer and
 * consumes the event only when the host handler returns literal true.
 */
export const tableLinkMouseHandler = function tableLinkMouseHandler(
  content: TextTableContent,
  onLinkActivate?: MarkdownLinkHandler
): ((event: MouseEvent) => void) | undefined {
  if (onLinkActivate === undefined) {
    return undefined;
  }
  return (event: MouseEvent): void => {
    if (event.button !== 0 || event.target === null) {
      return;
    }
    const hit = textTableCellAt(event.target, event.x, event.y);
    const chunks = hit === null ? null : content[hit.row]?.[hit.column];
    if (hit === null || chunks === null || chunks === undefined) {
      return;
    }
    const href = chunkLinkAt(chunks, hit.line, hit.offset);
    if (href === null || onLinkActivate(href) !== true) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
};
