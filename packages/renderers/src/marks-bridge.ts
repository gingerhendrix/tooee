import type { MarkState } from "@tooee/marks"
import type { RowDocumentDecorations } from "./RowDocumentRenderable.js"

/**
 * Converts a MarkState into RowDocumentDecorations for the imperative
 * RowDocumentRenderable API. Shared across CodeView, MarkdownView, and Table.
 */
export function marksToDecorations(marks: MarkState): RowDocumentDecorations {
  const cursorSet = marks.getSet("cursor")
  const selectionSet = marks.getSet("selection")
  const searchSet = marks.getSet("search")
  const currentMatchSet = marks.getSet("currentMatch")
  const toggledSet = marks.getSet("toggled")

  let cursorRow: number | undefined
  if (cursorSet && cursorSet.size > 0) {
    const first = cursorSet.marksInRange(0, Infinity)[0]
    if (first) cursorRow = first.range.from.line
  }

  let selection: { start: number; end: number } | null = null
  if (selectionSet && selectionSet.size > 0) {
    const first = selectionSet.marksInRange(0, Infinity)[0]
    if (first) selection = { start: first.range.from.line, end: first.range.to.line }
  }

  let matchingRows: Set<number> | undefined
  if (searchSet && searchSet.size > 0) {
    matchingRows = new Set<number>()
    for (const mark of searchSet) {
      for (let line = mark.range.from.line; line <= mark.range.to.line; line++) {
        matchingRows.add(line)
      }
    }
  }

  let currentMatchRow: number | undefined
  if (currentMatchSet && currentMatchSet.size > 0) {
    const first = currentMatchSet.marksInRange(0, Infinity)[0]
    if (first) currentMatchRow = first.range.from.line
  }

  let toggledRows: Set<number> | undefined
  if (toggledSet && toggledSet.size > 0) {
    toggledRows = new Set<number>()
    for (const mark of toggledSet) {
      for (let line = mark.range.from.line; line <= mark.range.to.line; line++) {
        toggledRows.add(line)
      }
    }
  }

  // Build signs map from marks with signBefore/signAfter styles
  const signs = new Map<number, { text: string; fg?: string }>()
  for (const set of marks.sets) {
    for (const mark of set) {
      const { signBefore, signAfter, foreground } = mark.style
      if (signBefore || signAfter) {
        const text = (signBefore ?? "") + (signAfter ?? "")
        if (text) {
          signs.set(mark.range.from.line, { text, fg: foreground })
        }
      }
    }
  }

  return {
    cursorRow,
    selection,
    matchingRows,
    currentMatchRow,
    toggledRows,
    signs: signs.size > 0 ? signs : undefined,
  }
}
