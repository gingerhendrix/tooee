import { useMemo } from "react";
import { Table, formatTableCell } from "@tooee/renderers";
import type { TableRow } from "@tooee/renderers";
import { getTextContent } from "../../types.js";
import type { TableContent } from "../../types.js";
import { useContentDocument } from "../../hooks/use-content-document.js";
import { ViewScreen } from "../view-screen.js";
import type { SubviewProps } from "./types.js";
import type { ReactNode } from "react";

interface TableSubviewProps extends SubviewProps {
  content: TableContent;
}

export const TableSubview = function TableSubview({
  content,
  decorations,
  actions,
  ...screen
}: TableSubviewProps): ReactNode {
  const textContent = useMemo(() => getTextContent(content), [content]);
  const { columns, rows } = content;
  const adapter = useMemo(
    () => ({
      getText: (row: TableRow) =>
        columns.map((column) => formatTableCell(row[column.key])).join("\t"),
    }),
    [columns],
  );
  const { document, showLineNumbers, statusItems } = useContentDocument<TableRow>(
    rows,
    adapter,
    { actions, content, decorations, textContent },
    {
      multiSelect: true,
      statusItems: [
        { label: "Format:", value: content.format },
        { label: "Rows:", value: String(rows.length) },
        { label: "Cols:", value: String(columns.length) },
      ],
    },
  );

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={statusItems}
      {...screen}
    >
      <Table columns={columns} rows={rows} showLineNumbers={showLineNumbers} document={document} />
    </ViewScreen>
  );
};
