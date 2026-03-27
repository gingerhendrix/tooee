import { useCommand } from "@tooee/commands"
import { copyToClipboard } from "@tooee/clipboard"
import type { Position, ModalCoreState } from "./index.js"

export interface SelectState {
  selectionAnchor: Position | null
  selection: { start: Position; end: Position } | null
}

export function useSelectCommands(
  state: ModalCoreState,
  selectionAnchor: Position | null,
  opts: {
    getText?: () => string | undefined
    blockLineMap?: number[]
  },
): void {
  const { setCursor, clampCursor, isBlockMode, multiSelect, setMode } = state
  const { getText, blockLineMap } = opts

  useCommand({
    id: "select-down",
    title: "Extend selection down",
    hotkey: "j",
    modes: ["select"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        return { line: clampCursor(c.line + 1), col: 0 }
      })
    },
  })

  useCommand({
    id: "select-up",
    title: "Extend selection up",
    hotkey: "k",
    modes: ["select"],
    handler: () => {
      setCursor((c) => {
        if (!c) return c
        return { line: clampCursor(c.line - 1), col: 0 }
      })
    },
  })

  useCommand({
    id: "select-toggle",
    title: "Toggle selection",
    hotkey: "tab",
    modes: ["select"],
    when: () => multiSelect,
    handler: () => {
      state.setToggledIndices((prev) => {
        const cursor = state.cursorRef.current
        if (!cursor) return prev
        const next = new Set(prev)
        const idx = cursor.line
        if (next.has(idx)) {
          next.delete(idx)
        } else {
          next.add(idx)
        }
        return next
      })
    },
  })

  useCommand({
    id: "select-copy",
    title: "Copy selection",
    hotkey: "y",
    modes: ["select"],
    handler: () => {
      if (!getText || !selectionAnchor) return
      const cursor = state.cursorRef.current
      if (!cursor) return
      const text = getText()
      if (!text) return

      if (isBlockMode && blockLineMap) {
        // Block-based copy: use blockLineMap to find line ranges
        const startBlock = Math.min(selectionAnchor.line, cursor.line)
        const endBlock = Math.max(selectionAnchor.line, cursor.line)
        const startLine = blockLineMap[startBlock] ?? 0
        const endLine =
          endBlock + 1 < blockLineMap.length
            ? (blockLineMap[endBlock + 1] ?? text.split("\n").length)
            : text.split("\n").length
        const lines = text.split("\n")
        const selected = lines.slice(startLine, endLine).join("\n")
        if (selected) {
          void copyToClipboard(selected)
        }
      } else {
        const lines = text.split("\n")
        const startLine = Math.min(selectionAnchor.line, cursor.line)
        const endLine = Math.max(selectionAnchor.line, cursor.line)
        const selected = lines.slice(startLine, endLine + 1).join("\n")
        if (selected) {
          void copyToClipboard(selected)
        }
      }
      setMode("cursor")
    },
  })

  useCommand({
    id: "select-cancel",
    title: "Cancel selection",
    hotkey: "escape",
    modes: ["select"],
    handler: () => setMode("cursor"),
  })
}
