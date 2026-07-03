import { type RefObject } from "react"
import { useTheme } from "@tooee/themes"
import type { MouseEvent } from "@opentui/core"
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
  /**
   * Left-click on a source line (additive; keyboard navigation is unaffected).
   * The row index is the line index, matching the view's `nav` model.
   */
  onRowClick?: (index: number) => void
  /** Right-click on a source line — receives the line index and click coords. */
  onRowContextMenu?: (index: number, x: number, y: number) => void
}

export function CodeView({
  content,
  language,
  showLineNumbers = true,
  marks,
  docRef,
  onRowClick,
  onRowContextMenu,
}: CodeViewProps) {
  const { syntax } = useTheme()
  const palette = useGutterPalette()

  // A single handler on the row-document maps the click's screen-Y to a logical
  // row. The code view renders one `<code>` provider (no per-line children), so
  // per-child handlers are impossible; clicks bubble up to the row-document and
  // are resolved via its virtual-row → row map (gutter clicks included).
  const handleMouseDown =
    onRowClick || onRowContextMenu
      ? (event: MouseEvent) => {
          const row = docRef?.current?.getRowAtScreenY(event.y)
          if (row == null) return
          if (event.button === 0) {
            onRowClick?.(row)
          } else if (event.button === 2) {
            event.preventDefault()
            onRowContextMenu?.(row, event.x, event.y)
          }
        }
      : undefined

  return (
    <row-document
      ref={docRef}
      showLineNumbers={showLineNumbers}
      palette={palette}
      decorations={marks?.sets}
      signColumnWidth={DEFAULT_SIGN_COLUMN_WIDTH}
      style={{ flexGrow: 1 }}
      onMouseDown={handleMouseDown}
    >
      <code content={content} filetype={language} syntaxStyle={syntax} />
    </row-document>
  )
}
