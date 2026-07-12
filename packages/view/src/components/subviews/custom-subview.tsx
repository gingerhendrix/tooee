import { useMemo } from "react";
import { CodeView, sourceLines, sourceLineAdapter } from "@tooee/renderers";
import type { SourceLineRow } from "@tooee/renderers";
import { useDocumentController } from "@tooee/shell";
import { getTextContent } from "../../types.js";
import type { CustomContent, ContentRenderer } from "../../types.js";
import { useContentCommands } from "../../hooks/use-content-commands.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";

interface CustomSubviewProps extends SubviewProps {
  content: CustomContent;
  renderers?: Record<string, ContentRenderer>;
}

export const CustomSubview = function CustomSubview({
  content,
  decorations,
  actions,
  renderers,
  ...screen
}: CustomSubviewProps): React.ReactNode {
  const textContent = useMemo(() => getTextContent(content), [content]);
  // Fallback rows are source lines; row index is the source line.
  const lineRows = useMemo(() => sourceLines(textContent), [textContent]);

  useContentCommands({ content, textContent });

  // Custom content has no action rows of its own, so no context menu is bound.
  const document = useDocumentController<SourceLineRow>({
    adapter: sourceLineAdapter,
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

  const customRenderer = renderers?.[content.format];

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={statusItems}
      {...screen}
    >
      {customRenderer ? (
        customRenderer({ content, document })
      ) : (
        <CodeView content={textContent} showLineNumbers={false} document={document} />
      )}
    </ViewScreen>
  );
};
