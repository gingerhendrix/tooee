import { useEffect, useMemo, useState } from "react";
import { sourceLineAdapter, sourceLines } from "@tooee/renderers";
import type { SourceLineRow } from "@tooee/renderers";
import type { ImageContent } from "../../types.js";
import { getTextContent } from "../../types.js";
import { useContentDocument } from "../../hooks/use-content-document.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";
import type { ReactNode } from "react";

interface ImageSubviewProps extends SubviewProps {
  content: ImageContent;
}

export const ImageSubview = function ImageSubview({
  content,
  decorations,
  actions,
  ...screen
}: ImageSubviewProps): ReactNode {
  const textContent = getTextContent(content);
  const rows = useMemo(() => sourceLines(textContent), [textContent]);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [content.src]);

  const { document, statusItems } = useContentDocument<SourceLineRow>(
    rows,
    sourceLineAdapter,
    { actions, content, decorations, textContent },
    {
      multiSelect: false,
      statusItems: [{ label: "Format:", value: content.format }],
    },
  );

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={statusItems}
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
