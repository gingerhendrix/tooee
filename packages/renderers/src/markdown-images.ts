import path from "node:path";
import type { Token, Tokens } from "marked";

const OBSIDIAN_IMAGE_EMBED = /!\[\[(?<target>[^\]|]+)(?:\|(?<display>[^\]]+))?\]\]/gu;
const IMAGE_DIMENSIONS = /^(?<width>\d+)(?:x(?<height>\d+))?$/u;
const URL_SCHEME = /^[a-z][a-z\d+.-]*:/iu;

export interface MarkdownImageEmbed {
  source: string;
  alt?: string;
  width?: number;
  height?: number;
}

export type MarkdownInlineSegment =
  | { type: "text"; tokens: Token[] }
  | ({ type: "image" } & MarkdownImageEmbed);

const obsidianEmbed = function obsidianEmbed(
  target: string,
  display: string | undefined,
): MarkdownImageEmbed {
  const source = target.trim();
  const dimensions = display?.trim().match(IMAGE_DIMENSIONS);
  if (dimensions?.groups?.width !== undefined) {
    return {
      height: dimensions.groups.height === undefined ? undefined : Number(dimensions.groups.height),
      source,
      width: Number(dimensions.groups.width),
    };
  }
  const alt = display?.trim();
  return { alt: alt === undefined || alt === "" ? undefined : alt, source };
};

/** Parse a complete Obsidian image embed such as `![[cover.png|40x12]]`. */
export const parseObsidianImageEmbed = function parseObsidianImageEmbed(
  value: string,
): MarkdownImageEmbed | null {
  const match = /^!\[\[(?<target>[^\]|]+)(?:\|(?<display>[^\]]+))?\]\]$/u.exec(value.trim());
  if (match?.groups?.target === undefined) {
    return null;
  }
  return obsidianEmbed(match.groups.target, match.groups.display);
};

const splitTextToken = function splitTextToken(text: string): MarkdownInlineSegment[] {
  const segments: MarkdownInlineSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(OBSIDIAN_IMAGE_EMBED)) {
    const { index } = match;
    if (index > cursor) {
      segments.push({
        tokens: [
          {
            raw: text.slice(cursor, index),
            text: text.slice(cursor, index),
            type: "text",
          },
        ],
        type: "text",
      });
    }
    const target = match.groups?.target;
    if (target !== undefined) {
      segments.push({ ...obsidianEmbed(target, match.groups?.display), type: "image" });
    }
    cursor = index + match[0].length;
  }
  if (cursor < text.length) {
    segments.push({
      tokens: [{ raw: text.slice(cursor), text: text.slice(cursor), type: "text" }],
      type: "text",
    });
  }
  return segments.length > 0
    ? segments
    : [{ tokens: [{ raw: text, text, type: "text" }], type: "text" }];
};

/** Split paragraph tokens into text and native-image render segments. */
export const splitMarkdownImages = function splitMarkdownImages(
  tokens: readonly Token[],
): MarkdownInlineSegment[] {
  const result: MarkdownInlineSegment[] = [];
  let pendingText: Token[] = [];

  const flushText = () => {
    if (pendingText.length > 0) {
      result.push({ tokens: pendingText, type: "text" });
      pendingText = [];
    }
  };

  for (const token of tokens) {
    if (token.type === "image") {
      // SAFETY: Marked creates an Image token for the adjacent token.type branch.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Marked's broad Token fallback prevents discriminator narrowing
      const imageToken = token as Tokens.Image;
      flushText();
      result.push({
        alt: imageToken.text === "" ? undefined : imageToken.text,
        source: imageToken.href,
        type: "image",
      });
      continue;
    }
    if (token.type === "text") {
      // SAFETY: Marked creates a Text token for the adjacent token.type branch.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Marked's broad Token fallback prevents discriminator narrowing
      const textToken = token as Tokens.Text;
      const parts = splitTextToken(textToken.text);
      for (const part of parts) {
        if (part.type === "text") {
          pendingText.push(...part.tokens);
        } else {
          flushText();
          result.push(part);
        }
      }
      continue;
    }
    pendingText.push(token);
  }
  flushText();
  return result;
};

/** Resolve relative image links against the Markdown document directory. */
export const resolveMarkdownImageSource = function resolveMarkdownImageSource(
  source: string,
  basePath?: string,
): string {
  if (path.isAbsolute(source) || URL_SCHEME.test(source)) {
    return source;
  }
  return path.resolve(basePath ?? process.cwd(), source);
};
