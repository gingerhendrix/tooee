import type { Token } from "marked";
import type { ReactNode } from "react";
import type { ResolvedTheme } from "@tooee/themes";
import { hasMarkedText, normalizeSoftLineEndings } from "./tokens.js";
import { visitInline } from "./visit-inline.js";

export const InlineTokens = function InlineTokens({
  tokens,
  theme,
}: {
  tokens: readonly Token[];
  theme: ResolvedTheme;
}): ReactNode {
  return visitInline<ReactNode>(tokens, {
    br: () => ["\n"],
    codespan: (token, key) => [
      <span key={key} fg={theme.markdownCode} bg={theme.backgroundPanel}>
        {` ${token.text} `}
      </span>,
    ],
    del: (_token, children, key) => [
      <span key={key} fg={theme.textMuted}>
        ~{children}~
      </span>,
    ],
    em: (_token, children, key) => [<em key={key}>{children}</em>],
    escape: (token) => [token.text],
    fallback: (token) => (hasMarkedText(token) ? [token.text] : []),
    image: (token, key) => [
      <span key={key} fg={theme.textMuted}>
        {token.text || token.href}
      </span>,
    ],
    link: (token, children, key) => [
      <u key={key}>
        <a href={token.href} fg={theme.markdownLink}>
          {children}
        </a>
      </u>,
    ],
    space: () => [" "],
    strong: (_token, children, key) => [<strong key={key}>{children}</strong>],
    text: (token) => [normalizeSoftLineEndings(token.text)],
  });
};
