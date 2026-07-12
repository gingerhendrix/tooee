import { useMemo } from "react";
import { Table } from "@tooee/renderers";
import type { TableRow } from "@tooee/renderers";
import { useDocumentController } from "@tooee/shell";
import { getTextContent } from "../../types.js";
import type { TableContent } from "../../types.js";
import { useContentCommands } from "../../hooks/useContentCommands.js";
import { ViewScreen } from "../ViewScreen.js";
import type { SubviewProps } from "./types.js";

interface TableSubviewProps extends SubviewProps {
  content: TableContent;
}

const stringifyRowCell = function stringifyRowCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const TableSubview = function TableSubview({
  content,
  decorations,
  actions,
  ...screen
}: TableSubviewProps): React.ReactNode {
  const textContent = useMemo(() => getTextContent(content), [content]);
  const { showLineNumbers } = useContentCommands({ content, textContent });

  const { columns, rows } = content;
  const adapter = useMemo(
    () => ({
      getText: (row: TableRow) =>
        columns.map((column) => stringifyRowCell(row[column.key])).join("\t"),
    }),
    [columns],
  );
  const document = useDocumentController<TableRow>({
    adapter,
    // The controller projects the screen's actions onto menu entries at open time.
    contextMenu: actions,
    decorations,
    multiSelect: true,
    rows,
  });

  const statusItems = useMemo(
    () => [
      { label: "Format:", value: content.format },
      { label: "Rows:", value: String(rows.length) },
      { label: "Cols:", value: String(columns.length) },
    ],
    [content.format, rows.length, columns.length],
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
