import { useEffect, useMemo, useRef } from "react"
import { Table, type RowDocumentRenderable } from "@tooee/renderers"
import { useTheme } from "@tooee/themes"
import { useViewCommandContext } from "../../hooks/useViewCommandContext.js"
import { useCopy, useNavigation } from "@tooee/shell"
import { useSearch } from "@tooee/search"
import { getTextContent, type TableContent } from "../../types.js"
import { useMarkState } from "../../hooks/useMarkState.js"
import { useViewCommands } from "../../hooks/useViewCommands.js"
import { SubviewLayout } from "../SubviewLayout.js"
import type { SubviewProps } from "./types.js"

interface TableSubviewProps extends SubviewProps {
  content: TableContent
}

export function TableSubview({
  content,
  providerMarks,
  userMarks,
  setMarkSet,
  clearMarkNamespace,
  clearAllUserMarks,
  reload,
  streaming,
  actions,
}: TableSubviewProps) {
  const { theme } = useTheme()
  const docRef = useRef<RowDocumentRenderable>(null)
  const textContent = useMemo(() => getTextContent(content), [content])

  const nav = useNavigation({
    rowCount: content.rows.length,
    multiSelect: true,
  })
  const search = useSearch({
    match: (query) => {
      const lowerQuery = query.toLowerCase()
      return content.rows.flatMap((row, index) =>
        content.columns.some((column) => stringifyRowCell(row[column.key]).toLowerCase().includes(lowerQuery))
          ? [index]
          : [],
      )
    },
    onJump: nav.setCursor,
  })
  useCopy({
    getRowText: (index) =>
      content.columns
        .map((column) => stringifyRowCell(content.rows[index]?.[column.key]))
        .join("\t"),
    cursor: nav.cursor,
    selection: nav.selection,
    toggledIndices: nav.toggledIndices,
  })
  const layoutNav = { ...nav, ...search }

  useEffect(() => {
    if (nav.cursor !== null) {
      docRef.current?.scrollToRow(nav.cursor, "nearest")
    }
  }, [nav.cursor])

  const { themeName, showLineNumbers } = useViewCommands({ content, textContent, actions })

  const markState = useMarkState({
    nav,
    search,
    theme,
    providerMarks,
    userMarks,
  })

  function getActiveRow(): Record<string, unknown> | undefined {
    if (nav.cursor === null) return undefined
    return content.rows[nav.cursor]
  }

  function getSelectedRows(): Record<string, unknown>[] {
    if (nav.toggledIndices.size) {
      return Array.from(nav.toggledIndices)
        .map((i) => content.rows[i])
        .filter(Boolean)
    }
    if (nav.selection) {
      const start = nav.selection.start
      const end = nav.selection.end
      return content.rows.slice(start, end + 1)
    }
    return []
  }

  useViewCommandContext({
    content,
    nav,
    reload,
    providerMarks,
    userMarks,
    setMarkSet,
    clearMarkNamespace,
    clearAllUserMarks,
    extras: {
      activeRow: getActiveRow(),
      selectedRows: getSelectedRows(),
    },
  })

  const extraStatusItems = useMemo(() => {
    const selectionCount =
      nav.selection != null ? nav.selection.end - nav.selection.start + 1 : 0
    const toggledCount = nav.toggledIndices.size
    const selectionItems =
      toggledCount > 0
        ? [{ label: "Selected:", value: String(toggledCount) }]
        : selectionCount > 0
          ? [{ label: "Selected:", value: String(selectionCount) }]
          : []
    return [
      { label: "Format:", value: content.format },
      { label: "Rows:", value: String(content.rows.length) },
      { label: "Cols:", value: String(content.columns.length) },
      ...selectionItems,
    ]
  }, [content.format, content.rows.length, content.columns.length, nav.selection, nav.toggledIndices])

  return (
    <SubviewLayout
      content={content}
      nav={layoutNav}
      streaming={streaming}
      themeName={themeName}
      extraStatusItems={extraStatusItems}
    >
      <Table
        columns={content.columns}
        rows={content.rows}
        showLineNumbers={showLineNumbers}
        marks={markState}
        docRef={docRef}
      />
    </SubviewLayout>
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
