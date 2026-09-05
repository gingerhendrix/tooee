import type { Tokens } from "marked";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { bold as boldChunk } from "@opentui/core";
import type { TextTableCellContent, TextTableContent } from "@opentui/core";
import { useTheme } from "@tooee/themes";
import { inlineTokensToChunks } from "../chunks.js";
import { getPlainText } from "../plain-text.js";

export const MarkdownTableRenderer = function MarkdownTableRenderer({
  token,
  indent,
}: {
  token: Tokens.Table;
  indent: number;
}): ReactNode {
  const { theme } = useTheme();

  const content: TextTableContent = useMemo(() => {
    const headerRow: TextTableCellContent[] = token.header.map((cell) => {
      const chunks = inlineTokensToChunks(cell.tokens, theme);
      return chunks.length > 0
        ? chunks.map((item) => boldChunk(item))
        : [boldChunk(getPlainText(cell.tokens).trim())];
    });
    const dataRows = token.rows.map((row) =>
      row.map((cell) => {
        const chunks = inlineTokensToChunks(cell.tokens, theme);
        if (chunks.length > 0) {
          return chunks;
        }
        const fallbackCell: TextTableCellContent = [
          { __isChunk: true, text: getPlainText(cell.tokens) },
        ];
        return fallbackCell;
      }),
    );
    return [headerRow, ...dataRows];
  }, [token, theme]);

  return (
    <box style={{ marginBottom: 1, marginLeft: 1 + indent, marginRight: 1 }}>
      <text-table
        content={content}
        wrapMode="word"
        columnWidthMode="content"
        cellPadding={0}
        border={true}
        borderStyle="single"
        borderColor={theme.border}
        fg={theme.text}
      />
    </box>
  );
};
