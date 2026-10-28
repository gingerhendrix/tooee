import { useRenderer } from "@opentui/react";
import { StatusPriority } from "@tooee/layout";
import { cellGeometry, naturalImageBox, sourceLineAdapter, sourceLines } from "@tooee/renderers";
import type { CellGeometry, SourceLineRow } from "@tooee/renderers";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { useContentDocument } from "../../hooks/use-content-document.js";
import type { ImageContent } from "../../types.js";
import { getTextContent } from "../../types.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";

interface ImageSubviewProps extends SubviewProps {
  content: ImageContent;
}

/** Cells between the image and the edge of the content area. */
const IMAGE_PADDING = 1;

interface NaturalSizeStyle {
  maxWidth?: number;
  maxHeight?: number;
}

interface PixelSize {
  width: number;
  height: number;
}

/**
 * Size limits for the image in `fit` mode: its pixel size in cells. The box
 * still grows with the content area up to these limits, so a large image
 * shrinks to fit the area and a small one keeps its own size.
 */
const naturalSizeStyle = function naturalSizeStyle(
  fit: ImageContent["fit"],
  pixels: PixelSize | null,
  geometry: CellGeometry
): NaturalSizeStyle {
  if (fit !== undefined && fit !== "fit") {
    return {};
  }

  if (pixels === null) {
    return {};
  }

  const box = naturalImageBox(pixels.width, pixels.height, geometry, {
    maxCols: Number.POSITIVE_INFINITY,
    maxRows: Number.POSITIVE_INFINITY,
  });

  return { maxHeight: box.rows, maxWidth: box.cols };
};

export const ImageSubview = function ImageSubview({
  content,
  decorations,
  actions,
  ...screen
}: ImageSubviewProps): ReactNode {
  const textContent = getTextContent(content);
  const rows = useMemo(() => sourceLines(textContent), [textContent]);
  const renderer = useRenderer();
  const [error, setError] = useState(false);
  const [pixels, setPixels] = useState<PixelSize | null>(null);

  useEffect(() => {
    setError(false);
    setPixels(null);
  }, [content.src]);

  const { document, statusItems } = useContentDocument<SourceLineRow>(
    rows,
    sourceLineAdapter,
    { actions, content, decorations, textContent },
    {
      multiSelect: false,
      statusItems: [{ label: "Format:", priority: StatusPriority.content, value: content.format }],
    }
  );

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={statusItems}
      {...screen}
    >
      <box
        style={{
          alignItems: "center",
          flexDirection: "column",
          flexGrow: 1,
          justifyContent: "center",
          padding: IMAGE_PADDING,
        }}
      >
        {error && <text content={`Image failed to load: ${textContent}`} />}
        <image
          source={content.src}
          fit={content.fit ?? "fit"}
          protocol={content.protocol ?? "auto"}
          onError={() => {
            setError(true);
          }}
          onLoad={(loaded) => {
            setError(false);
            setPixels({ height: loaded.height, width: loaded.width });
          }}
          style={{
            flexGrow: 1,
            width: "100%",
            ...naturalSizeStyle(content.fit, pixels, cellGeometry(renderer)),
          }}
        />
      </box>
    </ViewScreen>
  );
};
