import { useEffect, useMemo, type RefObject } from "react"
import { useTheme } from "@tooee/themes"
import type { MarkState } from "@tooee/marks"
import type {
  RowDocumentRenderable,
  RowDocumentPalette,
  RowDocumentDecorations,
} from "./RowDocumentRenderable.js"
import { marksToDecorations } from "./marks-bridge.js"

export interface DocumentDecorationProps {
  /** MarkState from the marks system -- when provided, takes priority over manual fields. */
  marks?: MarkState
  /** Manual cursor row (ignored when marks is provided). */
  cursorRow?: number
  /** Manual selection range (ignored when marks is provided). */
  selection?: { start: number; end: number } | null
  /** Manual matching rows, e.g. search hits (ignored when marks is provided). */
  matchingRows?: Set<number>
  /** Manual current match row (ignored when marks is provided). */
  currentMatchRow?: number
  /** Manual toggled rows (ignored when marks is provided). */
  toggledRows?: Set<number>
}

/**
 * Builds a standard RowDocumentPalette from the current theme and syncs
 * decorations (from marks or manual props) to a RowDocumentRenderable ref.
 *
 * Replaces the palette-construction + marksToDecorations + useEffect pattern
 * that was duplicated across CodeView, MarkdownView, and Table.
 */
export function useDocumentDecorations(
  ref: RefObject<RowDocumentRenderable | null>,
  props: DocumentDecorationProps,
): RowDocumentPalette {
  const { theme } = useTheme()

  const palette: RowDocumentPalette = useMemo(
    () => ({
      gutterFg: theme.textMuted,
      gutterBg: theme.backgroundElement,
      cursorBg: theme.cursorLine,
      selectionBg: theme.selection,
      matchBg: theme.warning,
      currentMatchBg: theme.primary,
      toggledBg: theme.backgroundPanel,
      cursorSignFg: theme.primary,
      matchSignFg: theme.warning,
      currentMatchSignFg: theme.primary,
    }),
    [
      theme.textMuted,
      theme.backgroundElement,
      theme.cursorLine,
      theme.selection,
      theme.warning,
      theme.primary,
      theme.backgroundPanel,
    ],
  )

  const { marks, cursorRow, selection, matchingRows, currentMatchRow, toggledRows } = props

  const marksDecos = useMemo(() => (marks ? marksToDecorations(marks) : null), [marks])

  useEffect(() => {
    const decorations: RowDocumentDecorations = marksDecos ?? {
      cursorRow,
      selection: selection ?? null,
      matchingRows,
      currentMatchRow,
      toggledRows,
    }
    ref.current?.setDecorations(decorations)
  }, [marksDecos, cursorRow, selection, matchingRows, currentMatchRow, toggledRows])

  return palette
}
