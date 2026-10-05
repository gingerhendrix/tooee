import type { ResolvedTheme } from "@tooee/themes";
import type { Tokens } from "marked";
import type { ReactNode } from "react";

import { InlineTokens } from "../inline.js";
import { linkMouseHandler } from "../links.js";
import type { MarkdownLinkHandler } from "../links.js";

/** The placeholder shown after a folded heading, for example ` ⋯ 12 blocks`. */
export const foldMarker = function foldMarker(hiddenCount: number): string {
  return ` ⋯ ${hiddenCount} ${hiddenCount === 1 ? "block" : "blocks"}`;
};

export const HeadingRenderer = function HeadingRenderer({
  token,
  theme,
  indent,
  hiddenCount,
  onLinkActivate,
}: {
  token: Tokens.Heading;
  theme: ResolvedTheme;
  indent: number;
  /** Blocks hidden under this heading by a closed fold; shows a muted marker. */
  hiddenCount?: number;
  onLinkActivate?: MarkdownLinkHandler;
}): ReactNode {
  const headingColors = new Map<number, string>([
    [1, theme.markdownHeading],
    [2, theme.secondary],
    [3, theme.accent],
    [4, theme.text],
    [5, theme.textMuted],
    [6, theme.textMuted],
  ]);
  const prefixes = new Map<number, string>([
    [1, "# "],
    [2, "## "],
    [3, "### "],
    [4, "#### "],
    [5, "##### "],
    [6, "###### "],
  ]);

  return (
    <box style={{ marginBottom: 1, marginLeft: indent, marginTop: 1 }}>
      <text
        style={{ fg: headingColors.get(token.depth) ?? theme.text }}
        onMouseDown={linkMouseHandler(
          token.tokens,
          onLinkActivate,
          Bun.stringWidth(prefixes.get(token.depth) ?? "")
        )}
      >
        <span fg={theme.textMuted}>{prefixes.get(token.depth)}</span>
        <strong>
          <InlineTokens tokens={token.tokens} theme={theme} />
        </strong>
        {hiddenCount === undefined ? null : (
          <span fg={theme.textMuted}>{foldMarker(hiddenCount)}</span>
        )}
      </text>
    </box>
  );
};
