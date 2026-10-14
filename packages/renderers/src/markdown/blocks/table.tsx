import { StyledText } from "@opentui/core";
import type { ResolvedTheme } from "@tooee/themes";
import type { Tokens } from "marked";
import { useMemo } from "react";
import type { ReactNode } from "react";

import type { MarkdownLinkHandler } from "../links.js";
import {
  tableBorderColumns,
  tableBorderLine,
  tableCellChunks,
  tableColumnWidths,
  tableRowCells,
} from "../table-layout.js";
import { tableCellLinkMouseHandler } from "../table-links.js";

/** Columns of the block margins: one plus the indent on the left, one on the right. */
const tableMarginColumns = function tableMarginColumns(indent: number): number {
  return 1 + indent + 1;
};

interface TableRowProps {
  table: Tokens.Table;
  /** `0` is the header row. Body rows start at `1`. */
  index: number;
  indent: number;
  theme: ResolvedTheme;
  /** Columns the Markdown view gives each block, before margins. */
  contentWidth: number;
  onLinkActivate?: MarkdownLinkHandler;
}

/**
 * One Markdown table row as one document row. Every row of a table gets the
 * same column widths from `tableColumnWidths`, so the rows line up as one
 * grid. The header row draws the top border and the header separator. Each
 * row draws the line under it, and the last row draws the bottom border.
 */
export const MarkdownTableRowRenderer = function MarkdownTableRowRenderer({
  table,
  index,
  indent,
  theme,
  contentWidth,
  onLinkActivate,
}: TableRowProps): ReactNode {
  const header = index === 0;
  const last = index === table.rows.length;

  const available =
    contentWidth - tableMarginColumns(indent) - tableBorderColumns(table.header.length);

  const widths = tableColumnWidths(table, available, theme);

  const cells = useMemo(
    () => tableRowCells(table, index).map((cell) => tableCellChunks(cell, theme, header)),
    [table, index, theme, header]
  );

  return (
    <box
      style={{
        flexDirection: "column",
        marginBottom: last ? 1 : 0,
        marginLeft: 1 + indent,
        marginRight: 1,
      }}
    >
      {header ? <text content={tableBorderLine(widths, "┌", "┬", "┐")} fg={theme.border} /> : null}
      <box style={{ flexDirection: "row" }}>
        {widths.map((width, column): ReactNode => {
          const chunks = cells[column] ?? [];

          return (
            <box
              key={column}
              border={column === 0 ? ["left", "right"] : ["right"]}
              borderStyle="single"
              borderColor={theme.border}
              style={{ flexShrink: 0, width: width + (column === 0 ? 2 : 1) }}
            >
              <text
                content={new StyledText(chunks)}
                wrapMode="word"
                fg={theme.text}
                onMouseDown={tableCellLinkMouseHandler(chunks, onLinkActivate)}
              />
            </box>
          );
        })}
      </box>
      <text
        content={
          last ? tableBorderLine(widths, "└", "┴", "┘") : tableBorderLine(widths, "├", "┼", "┤")
        }
        fg={theme.border}
      />
    </box>
  );
};

/**
 * A whole table in one block, for a `FlatBlock` that has a `table` token but no
 * `tableRow`, such as one built by hand. `flattenMarkdown` never makes one.
 */
export const MarkdownTableRenderer = function MarkdownTableRenderer({
  token,
  ...props
}: Omit<TableRowProps, "table" | "index"> & { token: Tokens.Table }): ReactNode {
  return (
    <box style={{ flexDirection: "column" }}>
      {Array.from({ length: token.rows.length + 1 }, (_row, index): ReactNode => (
        <MarkdownTableRowRenderer key={index} table={token} index={index} {...props} />
      ))}
    </box>
  );
};
