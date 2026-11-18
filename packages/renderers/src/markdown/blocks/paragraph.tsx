import { useRenderer, useTerminalDimensions } from "@opentui/react";
import type { ResolvedTheme } from "@tooee/themes";
import type { Tokens } from "marked";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { useImageSource } from "../../image-loaders.js";
import type { ImageLoader } from "../../image-loaders.js";
import { cellGeometry, IMAGE_WINDOW_PADDING_ROWS } from "../../image-size.js";
import {
  markdownImageBox,
  resolveMarkdownImageSource,
  splitMarkdownImages,
} from "../../markdown-images.js";
import type { MarkdownImageEmbed } from "../../markdown-images.js";
import { InlineTokens } from "../inline.js";
import { linkMouseHandler } from "../links.js";
import type { MarkdownLinkHandler } from "../links.js";

/** Columns of the paragraph margins: one plus the indent on the left, one on the right. */
const paragraphMarginColumns = function paragraphMarginColumns(indent: number): number {
  return 1 + indent + 1;
};

const MarkdownImage = function MarkdownImage({
  image,
  basePath,
  theme,
  maxCols,
  imageLoaders,
}: {
  image: MarkdownImageEmbed;
  basePath?: string;
  theme: ResolvedTheme;
  /** Columns inside the paragraph margins. */
  maxCols: number;
  imageLoaders?: readonly ImageLoader[];
}): ReactNode {
  const renderer = useRenderer();
  const { height: terminalHeight } = useTerminalDimensions();
  const source = resolveMarkdownImageSource(image.source, basePath);
  const resolved = useImageSource(source, imageLoaders);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  const [pixels, setPixels] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setState("loading");
    setPixels(null);
  }, [source]);

  // A loader reports the intrinsic CSS size. Its raster can be denser.
  const size = resolved.status === "ready" && resolved.size !== null ? resolved.size : pixels;

  const box = markdownImageBox(image, size, cellGeometry(renderer), {
    maxCols,
    maxRows: terminalHeight - IMAGE_WINDOW_PADDING_ROWS,
  });

  const failed = resolved.status === "error" || state === "error";

  return (
    <box style={{ flexDirection: "column" }}>
      {!failed && state === "loading" && (
        <text content={`Loading image: ${image.alt ?? image.source}`} fg={theme.textMuted} />
      )}
      {failed && (
        <text content={`Image failed to load: ${image.alt ?? image.source}`} fg={theme.error} />
      )}
      {resolved.status === "ready" && (
        <image
          source={resolved.source}
          fit="fit"
          protocol="auto"
          onLoad={(loaded) => {
            setPixels({ height: loaded.height, width: loaded.width });
            setState("loaded");
          }}
          onError={() => {
            setState("error");
          }}
          style={{ height: box.rows, width: box.cols }}
        />
      )}
    </box>
  );
};

export const ParagraphRenderer = function ParagraphRenderer({
  token,
  theme,
  indent,
  onLinkActivate,
  imageBasePath,
  imageLoaders,
  contentWidth,
}: {
  token: Tokens.Paragraph;
  theme: ResolvedTheme;
  indent: number;
  onLinkActivate?: MarkdownLinkHandler;
  imageBasePath?: string;
  /** Loaders for image formats that OpenTUI cannot decode, such as SVG. */
  imageLoaders?: readonly ImageLoader[];
  /** Columns the Markdown view gives each block, before margins. */
  contentWidth: number;
}): ReactNode {
  const segments = splitMarkdownImages(token.tokens);

  return (
    <box
      style={{
        flexDirection: "column",
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
      }}
    >
      {segments.map((segment, index): ReactNode =>
        segment.type === "image" ? (
          <MarkdownImage
            key={index}
            image={segment}
            basePath={imageBasePath}
            imageLoaders={imageLoaders}
            theme={theme}
            maxCols={contentWidth - paragraphMarginColumns(indent)}
          />
        ) : (
          <text
            key={index}
            style={{ fg: theme.markdownText }}
            onMouseDown={linkMouseHandler(segment.tokens, onLinkActivate)}
          >
            <InlineTokens tokens={segment.tokens} theme={theme} />
          </text>
        )
      )}
    </box>
  );
};
