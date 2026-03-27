import { useMemo } from "react"
import { marked } from "marked"
import { getTextContent, isBuiltinContent, type AnyContent } from "../types.js"

export function useContentMetrics(content: AnyContent | null) {
  const textContent = useMemo(() => (content ? getTextContent(content) : ""), [content])

  const lineCount = useMemo(() => {
    if (!content) return 0
    if (isBuiltinContent(content) && content.format === "table") {
      return content.rows.length
    }
    return textContent.split("\n").length
  }, [content, textContent])

  const { blockCount, blockLineMap } = useMemo(() => {
    if (!content) return { blockCount: undefined, blockLineMap: undefined }
    if (!isBuiltinContent(content)) return { blockCount: undefined, blockLineMap: undefined }

    if (content.format === "table") {
      const map = content.rows.map((_: unknown, i: number) => i)
      return { blockCount: content.rows.length, blockLineMap: map }
    }

    if (content.format !== "markdown") {
      return { blockCount: undefined, blockLineMap: undefined }
    }

    const tokens = marked.lexer(content.markdown)
    const blocks = tokens.filter((t) => t.type !== "space")
    const lineMap: number[] = []
    let lineOffset = 0
    for (const token of tokens) {
      if (token.type === "space") {
        if ("raw" in token && typeof token.raw === "string") {
          lineOffset += token.raw.split("\n").length - 1
        }
        continue
      }
      lineMap.push(lineOffset)
      if ("raw" in token && typeof token.raw === "string") {
        lineOffset += token.raw.split("\n").length - 1
      }
    }
    return { blockCount: blocks.length, blockLineMap: lineMap }
  }, [content])

  return { textContent, lineCount, blockCount, blockLineMap }
}
