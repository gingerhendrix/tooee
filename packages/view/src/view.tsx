import { useCallback, useMemo, useState } from "react";
import { useTheme } from "@tooee/themes";
import type { ActionDefinition } from "@tooee/commands";
import type { MarkSet } from "@tooee/marks";
import type { CodeBlockRenderer, MarkdownLinkHandler } from "@tooee/renderers";
import { isCustomContent } from "./types.js";
import type { ContentProvider, ContentRenderer } from "./types.js";
import { useContentLoader } from "./hooks/use-content-loader.js";
import {
  MarkdownSubview,
  CodeSubview,
  TableSubview,
  CustomSubview,
} from "./components/subviews/index.js";

interface ViewProps {
  contentProvider: ContentProvider;
  actions?: ActionDefinition[];
  renderers?: Record<string, ContentRenderer>;
  /**
   * Custom renderers for fenced code blocks in markdown content, keyed by
   * fence type (first word of the fence info string, case-insensitive).
   */
  codeBlockRenderers?: Record<string, CodeBlockRenderer>;
  /** Handles primary-button activation of inline Markdown links. */
  onMarkdownLinkActivate?: MarkdownLinkHandler;
}

export const View = function View({
  contentProvider,
  actions,
  renderers,
  codeBlockRenderers,
  onMarkdownLinkActivate,
}: ViewProps): React.ReactNode {
  const { theme } = useTheme();
  const { content, streaming, error, providerMarks, reload } = useContentLoader(contentProvider);

  const [userMarks, setUserMarks] = useState<MarkSet[]>([]);

  const setMarkSet = useCallback((set: MarkSet) => {
    setUserMarks((prev) => {
      const filtered = prev.filter((s) => s.namespace !== set.namespace);
      return [...filtered, set];
    });
  }, []);

  const clearMarkNamespace = useCallback((namespace: string) => {
    setUserMarks((prev) => prev.filter((s) => s.namespace !== namespace));
  }, []);

  const clearAllUserMarks = useCallback(() => {
    setUserMarks([]);
  }, []);

  // Mark sets are decoration layers; the controller composes them with the
  // interaction layers it generates, ordered by each set's own priority.
  const decorations = useMemo(() => [...providerMarks, ...userMarks], [providerMarks, userMarks]);

  if ((error?.length ?? 0) > 0) {
    return (
      <box style={{ flexDirection: "column" }}>
        <text content={`Error: ${error}`} fg={theme.error} />
      </box>
    );
  }

  if (!content) {
    return (
      <box>
        <text content="Loading..." fg={theme.textMuted} />
      </box>
    );
  }

  const shared = {
    actions,
    clearAllUserMarks,
    clearMarkNamespace,
    decorations,
    providerMarks,
    reload,
    setMarkSet,
    streaming,
    userMarks,
  };

  if (isCustomContent(content)) {
    return <CustomSubview content={content} renderers={renderers} {...shared} />;
  }

  switch (content.format) {
    case "markdown": {
      return (
        <MarkdownSubview
          content={content}
          codeBlockRenderers={codeBlockRenderers}
          onLinkActivate={onMarkdownLinkActivate}
          {...shared}
        />
      );
    }
    case "code":
    case "text": {
      return <CodeSubview content={content} {...shared} />;
    }
    case "table": {
      return <TableSubview content={content} {...shared} />;
    }
    default: {
      return null;
    }
  }
};
