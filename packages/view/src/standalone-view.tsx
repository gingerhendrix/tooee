import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCommand } from "@tooee/commands";
import path from "node:path";
import { createFileProvider } from "./default-provider.js";
import { firstMarkdownLink, resolveMarkdownLink } from "./markdown-links.js";
import { getTextContent } from "./types.js";
import type { ViewLaunchOptions } from "./launch.js";
import { View } from "./view.js";

/** The standalone host owns navigation; embedded View hosts retain their own policy. */
export const StandaloneView = function StandaloneView({
  filePath,
  contentProvider: initialProvider,
  ...options
}: ViewLaunchOptions): ReactNode {
  const [history, setHistory] = useState<string[]>(() =>
    filePath !== undefined && filePath !== "" ? [path.resolve(filePath)] : [],
  );
  const currentPath = history.at(-1);
  const contentProvider = useMemo(
    () =>
      history.length <= 1 || currentPath === undefined
        ? { ...initialProvider }
        : createFileProvider(currentPath),
    [history, currentPath, initialProvider],
  );
  const followLink = (href: string): boolean => {
    if (currentPath === undefined) {
      return false;
    }
    const target = resolveMarkdownLink(href, currentPath);
    if (target === null) {
      return false;
    }
    setHistory((paths) => [...paths, target]);
    return true;
  };

  useCommand({
    handler: () => {
      setHistory((paths) => (paths.length > 1 ? paths.slice(0, -1) : paths));
    },
    hotkey: "ctrl+o",
    id: "view.back",
    title: "Back to previous file",
    when: () => history.length > 1,
  });
  useCommand({
    handler: (context) => {
      // Source positions are zero-based, unlike the displayed line numbers.
      const line = context.document?.activeAnchor?.source?.primary?.start.line;
      const content = context.view?.content;
      if (line === undefined || content === undefined) {
        return;
      }
      const href = firstMarkdownLink(getTextContent(content).split("\n")[line] ?? "");
      if (href !== null) {
        followLink(href);
      }
    },
    hotkey: "enter",
    id: "view.follow-link",
    modes: ["cursor"],
    title: "Follow Markdown link",
    when: (context) => currentPath !== undefined && context.view?.format === "markdown",
  });

  return (
    <View
      key={history.length}
      {...options}
      contentProvider={contentProvider}
      onMarkdownLinkActivate={followLink}
    />
  );
};
