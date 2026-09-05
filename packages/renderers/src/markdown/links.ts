import type { Token } from "marked";
import type { MouseEvent, TextBufferRenderable } from "@opentui/core";
import { hasMarkedText, narrowToken, normalizeSoftLineEndings } from "./tokens.js";

// oxlint-disable-next-line anti-slop/no-unknown-returns -- public host callback accepts any ignored result; only literal true marks a handled link
export type MarkdownLinkHandler = (href: string) => unknown;

export interface InlineLinkPosition {
  line: number;
  column: number;
}

/** Resolve a rendered text position to the Markdown link occupying that cell. */
export const inlineLinkAtPosition = function inlineLinkAtPosition(
  tokens: readonly Token[],
  position: InlineLinkPosition,
  initialColumn = 0,
): string | null {
  let line = 0;
  let column = initialColumn;
  let found: string | null = null;

  const advanceText = (value: string, href?: string): void => {
    const parts = value.split("\n");
    for (const [index, part] of parts.entries()) {
      const width = Bun.stringWidth(part);
      if (
        href !== undefined &&
        line === position.line &&
        position.column >= column &&
        position.column < column + width
      ) {
        found = href;
      }
      column += width;
      if (index < parts.length - 1) {
        line += 1;
        column = 0;
      }
    }
  };

  const visit = (items: readonly Token[], href?: string): void => {
    for (const token of items) {
      if (found !== null) {
        return;
      }
      const text = narrowToken(token, "text");
      if (text !== null) {
        advanceText(normalizeSoftLineEndings(text.text), href);
        continue;
      }
      const link = narrowToken(token, "link");
      if (link !== null) {
        visit(link.tokens, link.href);
        continue;
      }
      const strong = narrowToken(token, "strong");
      if (strong !== null) {
        visit(strong.tokens, href);
        continue;
      }
      const em = narrowToken(token, "em");
      if (em !== null) {
        visit(em.tokens, href);
        continue;
      }
      const del = narrowToken(token, "del");
      if (del !== null) {
        advanceText("~", href);
        visit(del.tokens, href);
        advanceText("~", href);
        continue;
      }
      const codespan = narrowToken(token, "codespan");
      if (codespan !== null) {
        advanceText(` ${codespan.text} `, href);
        continue;
      }
      if (narrowToken(token, "br") !== null) {
        advanceText("\n", href);
      } else if (narrowToken(token, "space") !== null) {
        advanceText(" ", href);
      } else if (hasMarkedText(token)) {
        advanceText(token.text, href);
      }
    }
  };

  visit(tokens);
  return found;
};

export const linkMouseHandler = function linkMouseHandler(
  tokens: readonly Token[],
  onLinkActivate: MarkdownLinkHandler | undefined,
  initialColumn = 0,
): ((event: MouseEvent) => void) | undefined {
  if (onLinkActivate === undefined) {
    return undefined;
  }
  return (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    const { target } = event;
    if (target === null || target === undefined || !("lineInfo" in target)) {
      return;
    }
    // SAFETY: OpenTUI supplies a renderable target, and the lineInfo guard proves this text-buffer member.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- OpenTUI supplies renderable mouse targets
    const text = target as TextBufferRenderable;
    const visualLine = event.y - text.y;
    const sourceLine = text.lineInfo.lineSources[visualLine];
    const startColumn = text.lineInfo.lineStartCols[visualLine];
    if (sourceLine === undefined || startColumn === undefined) {
      return;
    }
    const href = inlineLinkAtPosition(
      tokens,
      {
        column: startColumn + event.x - text.x,
        line: sourceLine,
      },
      initialColumn,
    );
    if (href === null || onLinkActivate(href) !== true) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };
};
