import { useMemo } from "react";
import { CodeView, sourceLines, sourceLineAdapter } from "@tooee/renderers";
import type { SourceLineRow } from "@tooee/renderers";
import type { CodeContent, TextContent } from "../../types.js";
import { useContentDocument } from "../../hooks/use-content-document.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";
import type { ReactNode } from "react";

interface CodeSubviewProps extends SubviewProps {
  content: CodeContent | TextContent;
}

export const CodeSubview = function CodeSubview({
  content,
  decorations,
  actions,
  ...screen
}: CodeSubviewProps): ReactNode {
  const textContent = content.format === "code" ? content.code : content.text;
  // One navigation row per physical source line; row index is the source line.
  const lineRows = useMemo(() => sourceLines(textContent), [textContent]);

  const { document, showLineNumbers, statusItems } = useContentDocument<SourceLineRow>(
    lineRows,
    sourceLineAdapter,
    { actions, content, decorations, textContent },
    { multiSelect: true },
  );

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={statusItems}
      {...screen}
    >
      <CodeView
        content={textContent}
        language={content.format === "code" ? content.language : undefined}
        showLineNumbers={showLineNumbers}
        document={document}
      />
    </ViewScreen>
  );
};
