import { useEffect, useRef } from "react"
import type { LineNumberRenderable } from "@opentui/core"
import { useTheme } from "@tooee/themes"

interface CodeViewProps {
  content: string
  language?: string
  showLineNumbers?: boolean
  cursor?: number
  selectionStart?: number
  selectionEnd?: number
  matchingLines?: Set<number>
  currentMatchLine?: number
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
}: CodeViewProps) {
  const { syntax, theme } = useTheme()
  const lineNumRef = useRef<LineNumberRenderable>(null)

  useEffect(() => {
    const ref = lineNumRef.current
    if (!ref) return

    ref.clearAllLineColors()
    ref.clearAllLineSigns()

    // Search matches
    if (matchingLines) {
      for (const line of matchingLines) {
        ref.setLineSign(line, {
          after: "●",
          afterColor: line === currentMatchLine ? theme.primary : theme.warning,
        })
      }
    }

    // Selection range
    if (selectionStart != null && selectionEnd != null) {
      for (let i = selectionStart; i <= selectionEnd; i++) {
        ref.setLineColor(i, { content: theme.selection, gutter: theme.selection })
      }
    }

    // Cursor line (overwrites selection color on cursor line)
    if (cursor != null) {
      ref.setLineColor(cursor, { content: theme.cursorLine, gutter: theme.cursorLine })
      ref.setLineSign(cursor, {
        before: "▸",
        beforeColor: theme.primary,
        // Preserve search match sign if present
        ...(matchingLines?.has(cursor)
          ? {
              after: "●",
              afterColor: cursor === currentMatchLine ? theme.primary : theme.warning,
            }
          : {}),
      })
    }
  }, [content, cursor, selectionStart, selectionEnd, matchingLines, currentMatchLine, theme])

  const codeElement = <code content={content} filetype={language} syntaxStyle={syntax} />

  return (
    <box
      style={{
        flexDirection: "column",
      }}
    >
      {showLineNumbers ? (
        <line-number
          ref={lineNumRef}
          key={theme.textMuted + theme.backgroundElement}
          fg={theme.textMuted}
          bg={theme.backgroundElement}
          paddingRight={1}
          showLineNumbers
        >
          {codeElement}
        </line-number>
      ) : (
        codeElement
      )}
    </box>
  )
}
