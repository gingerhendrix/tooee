import type { Token, Tokens } from "marked";
import type { ReactNode } from "react";
import type { ResolvedTheme } from "@tooee/themes";
import { InlineTokens } from "../inline.js";
import { linkMouseHandler } from "../links.js";
import type { MarkdownLinkHandler } from "../links.js";
import { hasMarkedText } from "../tokens.js";

export const BlockquoteRenderer = function BlockquoteRenderer({
  token,
  theme,
  indent,
  onLinkActivate,
}: {
  token: Tokens.Blockquote;
  theme: ResolvedTheme;
  indent: number;
  onLinkActivate?: MarkdownLinkHandler;
}): ReactNode {
  const inlineTokens: Token[] = [];
  for (const child of token.tokens) {
    if ("tokens" in child && Array.isArray(child.tokens)) {
      if (inlineTokens.length > 0) {
        inlineTokens.push({ raw: "\n", type: "br" });
      }
      inlineTokens.push(...child.tokens);
    } else if (hasMarkedText(child)) {
      inlineTokens.push(child);
    }
  }

  return (
    <box
      border={["left"]}
      borderColor={theme.markdownBlockQuote}
      borderStyle="single"
      style={{
        marginBottom: 1,
        marginLeft: 1 + indent,
        marginRight: 1,
        marginTop: 0,
        paddingLeft: 1,
      }}
    >
      <text
        style={{ fg: theme.textMuted }}
        onMouseDown={linkMouseHandler(inlineTokens, onLinkActivate)}
      >
        <InlineTokens tokens={inlineTokens} theme={theme} />
      </text>
    </box>
  );
};
