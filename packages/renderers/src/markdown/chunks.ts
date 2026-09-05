import type { Token } from "marked";
import {
  bold as boldChunk,
  italic as italicChunk,
  parseColor,
  underline as underlineChunk,
} from "@opentui/core";
import type { TextChunk } from "@opentui/core";
import type { ResolvedTheme } from "@tooee/themes";
import { hasMarkedText } from "./tokens.js";
import { visitInline } from "./visit-inline.js";

const chunk = function chunk(text: string): TextChunk {
  return { __isChunk: true, text };
};

export const inlineTokensToChunks = function inlineTokensToChunks(
  tokens: readonly Token[],
  theme: ResolvedTheme,
): TextChunk[] {
  return visitInline<TextChunk>(tokens, {
    br: () => [],
    codespan: (token) => [
      {
        __isChunk: true,
        bg: parseColor(theme.backgroundPanel),
        fg: parseColor(theme.markdownCode),
        text: ` ${token.text} `,
      },
    ],
    del: (token) => [chunk(token.text)],
    em: (_token, children) => children.map((child) => italicChunk(child)),
    escape: (token) => [chunk(token.text)],
    fallback: (token) => (hasMarkedText(token) ? [chunk(token.text)] : []),
    image: (token) => [chunk(token.text)],
    link: (_token, children) =>
      children.map((child) => underlineChunk({ ...child, fg: parseColor(theme.markdownLink) })),
    space: () => [],
    strong: (_token, children) => children.map((child) => boldChunk(child)),
    text: (token) => [chunk(token.text)],
  });
};
