import { type RefObject } from "react"
import { useTheme } from "@tooee/themes"
import type { MarkState } from "@tooee/marks"
import { DEFAULT_SIGN_COLUMN_WIDTH, type RowDocumentRenderable } from "./RowDocumentRenderable.js"
import { useGutterPalette } from "./useGutterPalette.js"
import "./row-document.js"

interface CodeViewProps {
  content: string
  language?: string
  showLineNumbers?: boolean
  marks?: MarkState
  docRef?: RefObject<RowDocumentRenderable | null>
}

export function CodeView({ content, language, showLineNumbers = true, marks, docRef }: CodeViewProps) {
  const { syntax } = useTheme()
  const palette = useGutterPalette()

  return (
    <row-document
      ref={docRef}
      showLineNumbers={showLineNumbers}
      palette={palette}
      decorations={marks?.sets}
      signColumnWidth={DEFAULT_SIGN_COLUMN_WIDTH}
      style={{ flexGrow: 1 }}
    >
      <code content={content} filetype={language} syntaxStyle={syntax} />
    </row-document>
  )
}
