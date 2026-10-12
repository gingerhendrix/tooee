/** Highlighted source files from the component's registry item. */

import type { ScrollBoxRenderable } from "@opentui/core";
import { CodeView } from "@tooee/renderers";
import { useTheme } from "@tooee/themes";
import { useRef } from "react";
import type { ReactNode } from "react";

import type { Loaded } from "../data/client.js";
import type { SourceFile } from "../data/source.js";
import type { Resource } from "../use-resource.js";
import { useScrollCommands } from "../use-scroll-commands.js";
import { ResourceMessage } from "./resource-message.js";

export interface SourceTabProps {
  source: Resource<Loaded<SourceFile[]>>;
}

export const SourceTab = function SourceTab({ source }: SourceTabProps): ReactNode {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollBoxRenderable>(null);

  useScrollCommands(scrollRef, "source");

  if (source.status !== "ready") {
    return <ResourceMessage resource={source} what="source" />;
  }

  return (
    <scrollbox ref={scrollRef} flexGrow={1} focused={false}>
      {source.value.stale && (
        <text content="Offline: showing an expired cached copy." fg={theme.warning} />
      )}
      {source.value.value.map((file): ReactNode => (
        <box key={file.target} flexDirection="column" marginBottom={1}>
          <box paddingLeft={1}>
            <text content={`── ${file.target}`} fg={theme.accent} />
          </box>
          <CodeView content={file.content} language={file.language} />
        </box>
      ))}
    </scrollbox>
  );
};
