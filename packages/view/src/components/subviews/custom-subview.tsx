import { useMemo } from "react";
import { CodeView, sourceLines, sourceLineAdapter } from "@tooee/renderers";
import type { SourceLineRow } from "@tooee/renderers";
import { getTextContent } from "../../types.js";
import type { CustomContent, ContentRenderer } from "../../types.js";
import { useContentDocument } from "../../hooks/use-content-document.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";
import type { ReactNode } from "react";

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
}: CustomSubviewProps): ReactNode {
  const textContent = useMemo(() => getTextContent(content), [content]);
  // Fallback rows are source lines; row index is the source line.
  const lineRows = useMemo(() => sourceLines(textContent), [textContent]);

  const { document, statusItems } = useContentDocument<SourceLineRow>(
    lineRows,
    sourceLineAdapter,
    { actions, content, decorations, textContent },
    // Custom content has no action rows of its own, so no context menu is bound.
    { contextMenu: false, multiSelect: true },
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
