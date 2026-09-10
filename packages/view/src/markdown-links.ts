import { statSync } from "node:fs";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";
import { Lexer } from "marked";
import type { Token, Tokens } from "marked";

export type LinkResolution =
  | { status: "file"; path: string }
  | { status: "missing"; path: string }
  | { status: "directory"; path: string }
  | { status: "unsupported" };

/** Existing local files only. Fragments are validated, then open at the file top. */
export const resolveMarkdownLink = function resolveMarkdownLink(
  href: string,
  baseDir: string,
  currentPath?: string,
): LinkResolution {
  try {
    const decoded = decodeURIComponent(href);
    if (/[\p{Cc}\\]/u.test(decoded)) {
      return { status: "unsupported" };
    }
    const target = href.trim();
    if (!target || target.startsWith("//")) {
      return { status: "unsupported" };
    }
    const [rawPath] = target.split("#", 1);
    if (rawPath.includes("?")) {
      return { status: "unsupported" };
    }
    let path: string;
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/u.test(rawPath)) {
      // Check the authority before URL normalizes localhost into an empty host.
      if (!/^file:\/\/\//iu.test(rawPath)) {
        return { status: "unsupported" };
      }
      const url = new URL(rawPath);
      if (url.hostname || url.search) {
        return { status: "unsupported" };
      }
      path = fileURLToPath(url);
    } else {
      path = rawPath
        ? nodePath.resolve(baseDir, decodeURIComponent(rawPath))
        : (currentPath ?? baseDir);
    }
    const absolute = nodePath.resolve(path);
    try {
      const stat = statSync(absolute);
      if (stat.isFile()) {
        return { path: absolute, status: "file" };
      }
      return stat.isDirectory()
        ? { path: absolute, status: "directory" }
        : { status: "unsupported" };
    } catch {
      return { path: absolute, status: "missing" };
    }
  } catch {
    return { status: "unsupported" };
  }
};

export interface MarkdownLink {
  /** Link text as written in the source. */
  text: string;
  href: string;
}

/** Ordinary inline links in source order, skipping images and code spans. */
const collect = (tokens: Token[], links: MarkdownLink[]): void => {
  for (const token of tokens) {
    if (token.type === "link" && "href" in token) {
      // SAFETY: Marked's Generic token prevents discriminator narrowing.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- checked Marked link discriminator
      const { href, text } = token as Tokens.Link;
      links.push({ href, text });
    } else if (["strong", "em", "del"].includes(token.type) && "tokens" in token && token.tokens) {
      collect(token.tokens, links);
    }
  }
};
export const markdownLinks = function markdownLinks(line: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  collect(Lexer.lexInline(line), links);
  return links;
};
