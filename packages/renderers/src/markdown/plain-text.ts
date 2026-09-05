import type { Token } from "marked";
import { hasMarkedText, narrowToken } from "./tokens.js";

/** Extract unstyled inline text for table-cell fallback content. */
export const getPlainText = function getPlainText(tokens: readonly Token[]): string {
  return tokens
    .map((token) => {
      const text = narrowToken(token, "text");
      if (text !== null) {
        return text.text;
      }
      const codespan = narrowToken(token, "codespan");
      if (codespan !== null) {
        return codespan.text;
      }
      if ("tokens" in token && Array.isArray(token.tokens)) {
        return getPlainText(token.tokens);
      }
      return hasMarkedText(token) ? token.text : "";
    })
    .join("");
};
