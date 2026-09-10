import path from "node:path";
import type { CommandContext } from "@tooee/commands";
import type { NavigateHandle, RouteDefinition } from "@tooee/router";
import { resolveMarkdownLink } from "./markdown-links.js";

export interface LinkTarget {
  href: string;
  /** Directory that relative targets resolve against. */
  baseDir: string;
  /** Source document for fragment-only links. */
  currentPath?: string;
}

export interface LinkHandlerContext {
  navigate: NavigateHandle;
  documentRoute: RouteDefinition<{ path?: string }>;
  command: CommandContext;
}

/** Decide synchronously: true consumes the link, false tries the next handler. */
export type LinkHandler = (link: LinkTarget, context: LinkHandlerContext) => boolean;

export const localFileLinkHandler: LinkHandler = function localFileLinkHandler(link, context) {
  const result = resolveMarkdownLink(link.href, link.baseDir, link.currentPath);
  if (result.status === "unsupported") {
    return false;
  }
  if (result.status === "file") {
    void context.navigate.push(context.documentRoute, { path: result.path });
    return true;
  }
  const relative = path.relative(link.baseDir, result.path);
  const target =
    relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
      ? result.path
      : relative || ".";
  context.command.toast?.toast({
    level: "warning",
    message: `${result.status === "missing" ? "File not found" : "Not a file"}: ${target}`,
  });
  return true;
};

export const runLinkHandlers = function runLinkHandlers(
  handlers: readonly LinkHandler[],
  link: LinkTarget,
  context: LinkHandlerContext,
): boolean {
  for (const handler of handlers) {
    // oxlint-disable-next-line typescript/no-unnecessary-boolean-literal-compare -- preserve exact-true consumption for JavaScript callers too
    if (handler(link, context) === true) {
      return true;
    }
  }
  if (localFileLinkHandler(link, context)) {
    return true;
  }
  context.command.toast?.toast({ level: "warning", message: `Unsupported link: ${link.href}` });
  return true;
};
