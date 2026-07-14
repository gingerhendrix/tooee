import { useMemo } from "react";
import { CodeView, sourceLines, sourceLineAdapter } from "@tooee/renderers";
import type { SourceLineRow } from "@tooee/renderers";
import { useDocumentController } from "@tooee/shell";
import type { CodeContent, TextContent } from "../../types.js";
import { useContentCommands } from "../../hooks/use-content-commands.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";

interface CodeSubviewProps extends SubviewProps {
  content: CodeContent | TextContent;
}

export const CodeSubview = function CodeSubview({
  content,
  decorations,
  actions,
  ...screen
}: CodeSubviewProps): React.ReactNode {
  const textContent = content.format === "code" ? content.code : content.text;
  // One navigation row per physical source line; row index is the source line.
  const lineRows = useMemo(() => sourceLines(textContent), [textContent]);

  const { showLineNumbers } = useContentCommands({ content, textContent });

  const document = useDocumentController<SourceLineRow>({
    adapter: sourceLineAdapter,
    // The controller projects the screen's actions onto menu entries at open time.
    contextMenu: actions,
    decorations,
    multiSelect: true,
    rows: lineRows,
  });

  const statusItems = useMemo(
    () => [
      { label: "Format:", value: content.format },
      { label: "Lines:", value: String(lineRows.length) },
    ],
    [content.format, lineRows.length],
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
