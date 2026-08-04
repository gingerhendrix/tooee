import { useEffect, useMemo, useState } from "react";
import { sourceLineAdapter, sourceLines } from "@tooee/renderers";
import { useDocumentController } from "@tooee/shell";
import type { SourceLineRow } from "@tooee/renderers";
import type { ImageContent } from "../../types.js";
import { getTextContent } from "../../types.js";
import { useContentCommands } from "../../hooks/use-content-commands.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";

interface ImageSubviewProps extends SubviewProps {
  content: ImageContent;
}

export const ImageSubview = function ImageSubview({
  content,
  decorations,
  actions,
  ...screen
}: ImageSubviewProps): React.ReactNode {
  const textContent = getTextContent(content);
  const rows = useMemo(() => sourceLines(textContent), [textContent]);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [content.src]);

  useContentCommands({ content, textContent });
  const document = useDocumentController<SourceLineRow>({
    adapter: sourceLineAdapter,
    contextMenu: actions,
    decorations,
    multiSelect: false,
    rows,
  });

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={[{ label: "Format:", value: content.format }]}
      {...screen}
    >
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        {error && <text content={`Image failed to load: ${textContent}`} />}
        <image
          source={content.src}
          fit={content.fit ?? "fit"}
          protocol={content.protocol ?? "auto"}
          onError={() => {
            setError(true);
          }}
          onLoad={() => {
            setError(false);
          }}
          style={{ flexGrow: 1 }}
        />
      </box>
    </ViewScreen>
  );
};
