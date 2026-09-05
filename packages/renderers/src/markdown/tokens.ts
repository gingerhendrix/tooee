import type { Token, Tokens } from "marked";

interface KnownTokenByType {
  blockquote: Tokens.Blockquote;
  br: Tokens.Br;
  code: Tokens.Code;
  codespan: Tokens.Codespan;
  del: Tokens.Del;
  em: Tokens.Em;
  escape: Tokens.Escape;
  heading: Tokens.Heading;
  image: Tokens.Image;
  link: Tokens.Link;
  paragraph: Tokens.Paragraph;
  space: Tokens.Space;
  strong: Tokens.Strong;
  table: Tokens.Table;
  text: Tokens.Text;
}

export interface MarkedText {
  text: string;
}

/**
 * Narrow Marked's broad token contract after checking its runtime discriminator.
 * Marked's `Generic` fallback prevents TypeScript from retaining this narrowing.
 */
export const narrowToken = function narrowToken<Type extends keyof KnownTokenByType>(
  token: Token,
  type: Type,
): KnownTokenByType[Type] | null {
  if (token.type !== type) {
    return null;
  }
  // SAFETY: Marked creates the token member selected by the checked type discriminator.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the Generic fallback prevents discriminator narrowing
  return token as KnownTokenByType[Type];
};

/** Decode the optional text field on Marked's broad fallback token contract. */
export const hasMarkedText = function hasMarkedText(token: Token): token is Token & MarkedText {
  if (!("text" in token)) {
    return false;
  }
  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- primitive check stays at the Marked token boundary
  return typeof token.text === "string";
};

/** Markdown soft line endings separate prose words without forcing a rendered break. */
export const normalizeSoftLineEndings = function normalizeSoftLineEndings(value: string): string {
  return value.replaceAll("\n", " ");
};
