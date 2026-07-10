import { useMemo } from "react"
import { Table, type TableRow } from "@tooee/renderers"
import { actionsToContextMenuEntries, useDocumentController } from "@tooee/shell"
import { getTextContent, type TableContent } from "../../types.js"
import { useContentCommands } from "../../hooks/useContentCommands.js"
import { ViewScreen } from "../ViewScreen.js"
import type { SubviewProps } from "./types.js"

interface TableSubviewProps extends SubviewProps {
  content: TableContent
}

export function TableSubview({ content, decorations, actions, ...screen }: TableSubviewProps) {
  const textContent = useMemo(() => getTextContent(content), [content])
  const { showLineNumbers } = useContentCommands({ content, textContent })

  const { columns, rows } = content
  const adapter = useMemo(
    () => ({
      getText: (row: TableRow) =>
        columns.map((column) => stringifyRowCell(row[column.key])).join("\t"),
    }),
    [columns],
  )
  const contextMenu = useMemo(() => actionsToContextMenuEntries(actions), [actions])

  const document = useDocumentController<TableRow>({
    rows,
    adapter,
    multiSelect: true,
    decorations,
    contextMenu,
  })

  const statusItems = useMemo(
    () => [
      { label: "Format:", value: content.format },
      { label: "Rows:", value: String(rows.length) },
      { label: "Cols:", value: String(columns.length) },
    ],
    [content.format, rows.length, columns.length],
  )

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
  )
}

function stringifyRowCell(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
