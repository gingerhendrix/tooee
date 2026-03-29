import { useCommand, useSetMode } from "@tooee/commands"
import { copyToClipboard } from "@tooee/clipboard"
import type { Position } from "./navigation.js"

export interface UseCopyOptions {
  getRowText: (index: number) => string
  cursor: Position | null
  selection: { start: Position; end: Position } | null
  toggledIndices: Set<number>
}

export function useCopy({ getRowText, cursor, selection, toggledIndices }: UseCopyOptions): void {
  const setMode = useSetMode()

  useCommand({
    id: "select-copy",
    title: "Copy selection",
    hotkey: "y",
    modes: ["select"],
    handler: () => {
      let text = ""

      if (toggledIndices.size > 0) {
        text = Array.from(toggledIndices)
          .sort((left, right) => left - right)
          .map((index) => getRowText(index))
          .join("\n")
      } else if (selection) {
        const rows: string[] = []
        for (let index = selection.start.line; index <= selection.end.line; index++) {
          rows.push(getRowText(index))
        }
        text = rows.join("\n")
      } else if (cursor) {
        text = getRowText(cursor.line)
      }

      if (text) {
        void copyToClipboard(text)
      }

      setMode("cursor")
    },
  })
}
