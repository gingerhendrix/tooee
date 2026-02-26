import { useEffect, useRef, type RefObject } from "react"
import { useTheme } from "@tooee/themes"
import type { RowDocumentRenderable, RowDocumentPalette, RowDocumentDecorations } from "./RowDocumentRenderable.js"
import "./row-document.js"

interface CodeViewProps {
  content: string
  language?: string
  showLineNumbers?: boolean
  cursor?: number
  selectionStart?: number
  selectionEnd?: number
  matchingLines?: Set<number>
  currentMatchLine?: number
  toggledLines?: Set<number>
  docRef?: RefObject<RowDocumentRenderable | null>
}

export function CodeView({
  content,
  language,
  showLineNumbers = true,
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

  useEffect(() => {
    const decorations: RowDocumentDecorations = {
      cursorRow: cursor,
      selection: selectionStart != null && selectionEnd != null
        ? { start: selectionStart, end: selectionEnd }
        : null,
      matchingRows: matchingLines,
      currentMatchRow: currentMatchLine,
      toggledRows: toggledLines,
    }
    effectiveRef.current?.setDecorations(decorations)
  }, [cursor, selectionStart, selectionEnd, matchingLines, currentMatchLine, toggledLines])

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
