import { useEffect, useRef, useMemo, type RefObject } from "react"
import { useTheme } from "@tooee/themes"
import type { MarkState } from "@tooee/marks"
import type { RowDocumentRenderable, RowDocumentPalette, RowDocumentDecorations } from "./RowDocumentRenderable.js"
import "./row-document.js"

interface CodeViewProps {
  content: string
  language?: string
  showLineNumbers?: boolean
  marks?: MarkState
  cursor?: number
  selectionStart?: number
  selectionEnd?: number
  matchingLines?: Set<number>
  currentMatchLine?: number
  toggledLines?: Set<number>
  docRef?: RefObject<RowDocumentRenderable | null>
}

function marksToDecorations(marks: MarkState): RowDocumentDecorations {
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

export function CodeView({
  content,
  language,
  showLineNumbers = true,
  marks,
  cursor,
  selectionStart,
  selectionEnd,
  matchingLines,
  currentMatchLine,
  toggledLines,
  docRef,
}: CodeViewProps) {
  const { syntax, theme } = useTheme()
  const internalRef = useRef<RowDocumentRenderable>(null)
  const effectiveRef = docRef ?? internalRef

  const palette: RowDocumentPalette = {
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
  }

  const marksDecorations = useMemo(
    () => marks ? marksToDecorations(marks) : null,
    [marks],
  )

  useEffect(() => {
    const decorations: RowDocumentDecorations = marksDecorations ?? {
      cursorRow: cursor,
      selection: selectionStart != null && selectionEnd != null
        ? { start: selectionStart, end: selectionEnd }
        : null,
      matchingRows: matchingLines,
      currentMatchRow: currentMatchLine,
      toggledRows: toggledLines,
    }
    effectiveRef.current?.setDecorations(decorations)
  }, [marksDecorations, cursor, selectionStart, selectionEnd, matchingLines, currentMatchLine, toggledLines])

  const codeElement = <code content={content} filetype={language} syntaxStyle={syntax} />

  return (
    <row-document
      ref={effectiveRef}
      key={theme.textMuted + theme.backgroundElement}
      showLineNumbers={showLineNumbers}
      palette={palette}
      signColumnWidth={1}
      style={{ flexGrow: 1 }}
    >
      {codeElement}
    </row-document>
  )
}
