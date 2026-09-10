import { statSync } from "node:fs";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";
import { Lexer } from "marked";
import type { Token, Tokens } from "marked";

/** Existing local files only. Fragments are validated, then open at the file top. */
export const resolveMarkdownLink = function resolveMarkdownLink(
  href: string,
  currentPath: string,
): string | null {
  try {
    const decoded = decodeURIComponent(href);
    if (/[\p{Cc}\\]/u.test(decoded)) {
      return null;
    }
    const target = href.trim();
    if (!target || target.startsWith("//")) {
      return null;
    }
    const [rawPath] = target.split("#", 1);
    if (rawPath.includes("?")) {
      return null;
    }
    let path: string;
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/u.test(rawPath)) {
      // Check the authority before URL normalizes localhost into an empty host.
      if (!/^file:\/\/\//iu.test(rawPath)) {
        return null;
      }
      const url = new URL(rawPath);
      if (url.hostname || url.search) {
        return null;
      }
      path = fileURLToPath(url);
    } else {
      path = rawPath
        ? nodePath.resolve(nodePath.dirname(currentPath), decodeURIComponent(rawPath))
        : currentPath;
    }
    const absolute = nodePath.resolve(path);
    return statSync(absolute).isFile() ? absolute : null;
  } catch {
    return null;
  }
};

/** First ordinary inline link, skipping images and code spans. */
const visit = (tokens: Token[]): string | null => {
  for (const token of tokens) {
    if (token.type === "link" && "href" in token) {
      // SAFETY: Marked's Generic token prevents discriminator narrowing.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- checked Marked link discriminator
      return (token as Tokens.Link).href;
    }
    if (["strong", "em", "del"].includes(token.type) && "tokens" in token && token.tokens) {
      const href = visit(token.tokens);
      if (href !== null) {
        return href;
      }
    }
  }
  return null;
};
export const firstMarkdownLink = function firstMarkdownLink(line: string): string | null {
  return visit(Lexer.lexInline(line));
};
