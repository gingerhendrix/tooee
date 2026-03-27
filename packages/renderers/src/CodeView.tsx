import { useRef, type RefObject } from "react"
import { useTheme } from "@tooee/themes"
import type { MarkState } from "@tooee/marks"
import type { RowDocumentRenderable } from "./RowDocumentRenderable.js"
import { useDocumentDecorations } from "./useDocumentDecorations.js"
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

  const palette = useDocumentDecorations(effectiveRef, {
    marks,
    cursorRow: cursor,
    selection:
      selectionStart != null && selectionEnd != null
        ? { start: selectionStart, end: selectionEnd }
        : undefined,
    matchingRows: matchingLines,
    currentMatchRow: currentMatchLine,
    toggledRows: toggledLines,
  })

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
