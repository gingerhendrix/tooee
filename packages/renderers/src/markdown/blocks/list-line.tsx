import type { Token } from "marked";
import type { ReactNode } from "react";
import type { ResolvedTheme } from "@tooee/themes";
import { checkboxMarker } from "../../markdown-blocks.js";
import type { FlatBlock } from "../../markdown-blocks.js";
import { InlineTokens } from "../inline.js";
import { linkMouseHandler } from "../links.js";
import type { MarkdownLinkHandler } from "../links.js";
import { hasMarkedText } from "../tokens.js";

export const ListLineRenderer = function ListLineRenderer({
  block,
  theme,
  onLinkActivate,
}: {
  block: FlatBlock;
  theme: ResolvedTheme;
  onLinkActivate?: MarkdownLinkHandler;
}): ReactNode {
  const { token, indent, bullet, checked } = block;
  const checkboxPrefix = checkboxMarker(checked);
  const inlineTokens: Token[] =
    "tokens" in token && Array.isArray(token.tokens) ? token.tokens : [];
  const tokenText = hasMarkedText(token) ? token.text : "";
  const hasContent = inlineTokens.length > 0 || tokenText.length > 0;

  let content: ReactNode = null;
  if (inlineTokens.length > 0) {
    content = <InlineTokens tokens={inlineTokens} theme={theme} />;
  } else if (tokenText.length > 0) {
    content = tokenText;
  }

  return (
    <box style={{ marginLeft: 1 + indent, marginRight: 1 }}>
      <text
        style={{ fg: theme.markdownText }}
        onMouseDown={linkMouseHandler(
          inlineTokens,
          onLinkActivate,
          Bun.stringWidth(`${bullet}${checkboxPrefix}`),
        )}
      >
        <span fg={theme.markdownListItem}>{bullet}</span>
        {checkboxPrefix !== "" && (
          <span fg={checked === true ? theme.accent : theme.textMuted}>{checkboxPrefix}</span>
        )}
        {hasContent && content}
      </text>
    </box>
  );
};
