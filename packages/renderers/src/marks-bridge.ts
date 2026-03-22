import type { MarkSet, MarkState } from "@tooee/marks"
import type { RowDocumentDecorations } from "./RowDocumentRenderable.js"

/** Get the first mark from a set using the iterator (avoids materializing the entire array). */
function firstMark(set: MarkSet) {
  return set[Symbol.iterator]().next().value
}

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
    const first = firstMark(cursorSet)
    if (first) cursorRow = first.range.from.line
  }

  let selection: { start: number; end: number } | null = null
  if (selectionSet && selectionSet.size > 0) {
    const first = firstMark(selectionSet)
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
    const first = firstMark(currentMatchSet)
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

  // Collect backgrounds from non-built-in marks.
  // marks.sets is sorted by ascending priority, so later sets override earlier ones.
  const builtinNamespaces = new Set(["cursor", "selection", "search", "currentMatch", "toggled"])
  const markBackgrounds = new Map<number, string>()
  const markGutterBackgrounds = new Map<number, string>()

  for (const set of marks.sets) {
    if (builtinNamespaces.has(set.namespace)) continue
    for (const mark of set) {
      // NOTE: for very large ranges this loop could be expensive
      if (mark.style.background) {
        for (let line = mark.range.from.line; line <= mark.range.to.line; line++) {
          markBackgrounds.set(line, mark.style.background)
        }
      }
      if (mark.style.gutterBackground) {
        for (let line = mark.range.from.line; line <= mark.range.to.line; line++) {
          markGutterBackgrounds.set(line, mark.style.gutterBackground)
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
    markBackgrounds: markBackgrounds.size > 0 ? markBackgrounds : undefined,
    markGutterBackgrounds: markGutterBackgrounds.size > 0 ? markGutterBackgrounds : undefined,
  }
}
