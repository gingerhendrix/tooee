import { useCommand, useSetMode } from "@tooee/commands"
import { copyToClipboard } from "@tooee/clipboard"

export interface UseCopyOptions {
  getRowText: (index: number) => string
  cursor: number | null
  selection: { start: number; end: number } | null
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
        for (let index = selection.start; index <= selection.end; index++) {
          rows.push(getRowText(index))
        }
        text = rows.join("\n")
      } else if (cursor !== null) {
        text = getRowText(cursor)
      }

      if (text) {
        void copyToClipboard(text)
      }

      setMode("cursor")
    },
  })
}
