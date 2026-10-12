/** Rendered docs page for one component, from the termcn Markdown mirror. */

import type { ScrollBoxRenderable } from "@opentui/core";
import { MarkdownView } from "@tooee/renderers";
import { useTheme } from "@tooee/themes";
import { useRef } from "react";
import type { ReactNode } from "react";

import type { DocsPage, Loaded } from "../data/client.js";
import type { Resource } from "../use-resource.js";
import { useScrollCommands } from "../use-scroll-commands.js";
import { ResourceMessage } from "./resource-message.js";

export interface DocsTabProps {
  docs: Resource<Loaded<DocsPage>>;
}

export const DocsTab = function DocsTab({ docs }: DocsTabProps): ReactNode {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollBoxRenderable>(null);

  useScrollCommands(scrollRef, "docs");

  if (docs.status !== "ready") {
    return <ResourceMessage resource={docs} what="docs" />;
  }

  const page = docs.value.value;

  if (page.kind === "missing") {
    return (
      <box paddingLeft={1}>
        <text content={page.reason} fg={theme.textMuted} />
      </box>
    );
  }

  return (
    <scrollbox ref={scrollRef} flexGrow={1} focused={false} paddingLeft={1} paddingRight={1}>
      {docs.value.stale && (
        <text content="Offline: showing an expired cached copy." fg={theme.warning} />
      )}
      <MarkdownView content={page.markdown} showLineNumbers={false} />
    </scrollbox>
  );
};
