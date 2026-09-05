import type { Tokens } from "marked";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ResolvedTheme } from "@tooee/themes";
import { resolveMarkdownImageSource, splitMarkdownImages } from "../../markdown-images.js";
import type { MarkdownImageEmbed } from "../../markdown-images.js";
import { InlineTokens } from "../inline.js";
import { linkMouseHandler } from "../links.js";
import type { MarkdownLinkHandler } from "../links.js";

const MarkdownImage = function MarkdownImage({
  image,
  basePath,
  theme,
}: {
  image: MarkdownImageEmbed;
  basePath?: string;
  theme: ResolvedTheme;
}): ReactNode {
  const source = resolveMarkdownImageSource(image.source, basePath);
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    setState("loading");
  }, [source]);

  return (
    <box style={{ flexDirection: "column" }}>
      {state === "loading" && (
        <text content={`Loading image: ${image.alt ?? image.source}`} fg={theme.textMuted} />
      )}
      {state === "error" && (
        <text content={`Image failed to load: ${image.alt ?? image.source}`} fg={theme.error} />
      )}
      <image
        source={source}
        fit="fit"
        protocol="auto"
        onLoad={() => {
          setState("loaded");
        }}
        onError={() => {
          setState("error");
        }}
        style={{ height: image.height ?? 12, width: image.width ?? "100%" }}
      />
    </box>
  );
};

export const ParagraphRenderer = function ParagraphRenderer({
  token,
  theme,
  indent,
  onLinkActivate,
  imageBasePath,
}: {
  token: Tokens.Paragraph;
  theme: ResolvedTheme;
  indent: number;
  onLinkActivate?: MarkdownLinkHandler;
  imageBasePath?: string;
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
      {segments.map(
        (segment, index): ReactNode =>
          segment.type === "image" ? (
            <MarkdownImage key={index} image={segment} basePath={imageBasePath} theme={theme} />
          ) : (
            <text
              key={index}
              style={{ fg: theme.markdownText }}
              onMouseDown={linkMouseHandler(segment.tokens, onLinkActivate)}
            >
              <InlineTokens tokens={segment.tokens} theme={theme} />
            </text>
          ),
      )}
    </box>
  );
};
