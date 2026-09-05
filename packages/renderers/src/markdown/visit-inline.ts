import type { Token, Tokens } from "marked";
import { narrowToken } from "./tokens.js";

export interface InlineVisitorSink<Result> {
  text: (token: Tokens.Text, key: string) => readonly Result[];
  strong: (token: Tokens.Strong, children: readonly Result[], key: string) => readonly Result[];
  em: (token: Tokens.Em, children: readonly Result[], key: string) => readonly Result[];
  codespan: (token: Tokens.Codespan, key: string) => readonly Result[];
  link: (token: Tokens.Link, children: readonly Result[], key: string) => readonly Result[];
  del: (token: Tokens.Del, children: readonly Result[], key: string) => readonly Result[];
  image: (token: Tokens.Image, key: string) => readonly Result[];
  br: (token: Tokens.Br, key: string) => readonly Result[];
  escape: (token: Tokens.Escape, key: string) => readonly Result[];
  space: (token: Tokens.Space, key: string) => readonly Result[];
  fallback: (token: Token, key: string) => readonly Result[];
}

/** Walk inline Marked tokens once and delegate output construction to a sink. */
export const visitInline = function visitInline<Result>(
  tokens: readonly Token[],
  sink: InlineVisitorSink<Result>,
  keyPrefix = "",
): Result[] {
  const result: Result[] = [];

  for (const [index, token] of tokens.entries()) {
    const key = `${keyPrefix}${index}`;
    const text = narrowToken(token, "text");
    if (text !== null) {
      result.push(...sink.text(text, key));
      continue;
    }
    const strong = narrowToken(token, "strong");
    if (strong !== null) {
      result.push(...sink.strong(strong, visitInline(strong.tokens, sink, `${key}.`), key));
      continue;
    }
    const em = narrowToken(token, "em");
    if (em !== null) {
      result.push(...sink.em(em, visitInline(em.tokens, sink, `${key}.`), key));
      continue;
    }
    const codespan = narrowToken(token, "codespan");
    if (codespan !== null) {
      result.push(...sink.codespan(codespan, key));
      continue;
    }
    const link = narrowToken(token, "link");
    if (link !== null) {
      result.push(...sink.link(link, visitInline(link.tokens, sink, `${key}.`), key));
      continue;
    }
    const del = narrowToken(token, "del");
    if (del !== null) {
      result.push(...sink.del(del, visitInline(del.tokens, sink, `${key}.`), key));
      continue;
    }
    const image = narrowToken(token, "image");
    if (image !== null) {
      result.push(...sink.image(image, key));
      continue;
    }
    const br = narrowToken(token, "br");
    if (br !== null) {
      result.push(...sink.br(br, key));
      continue;
    }
    const escape = narrowToken(token, "escape");
    if (escape !== null) {
      result.push(...sink.escape(escape, key));
      continue;
    }
    const space = narrowToken(token, "space");
    if (space !== null) {
      result.push(...sink.space(space, key));
      continue;
    }
    result.push(...sink.fallback(token, key));
  }

  return result;
};
