import { useCommand, useSetMode } from "@tooee/commands";
import { copyToClipboard } from "@tooee/clipboard";

export interface UseCopyOptions {
  getRowText: (index: number) => string;
  cursor: number | null;
  selection: { start: number; end: number } | null;
  toggledIndices: ReadonlySet<number>;
  /** Register the copy command (default true). */
  enabled?: boolean;
}

export const useCopy = function useCopy({
  getRowText,
  cursor,
  selection,
  toggledIndices,
  enabled,
}: UseCopyOptions): void {
  const setMode = useSetMode();

  useCommand({
    enabled,
    handler: () => {
      let text = "";

      if (toggledIndices.size > 0) {
        text = [...toggledIndices]
          .toSorted((left, right) => left - right)
          .map((index) => getRowText(index))
          .join("\n");
      } else if (selection) {
        const rows: string[] = [];
        for (let index = selection.start; index <= selection.end; index += 1) {
          rows.push(getRowText(index));
        }
        text = rows.join("\n");
      } else if (cursor !== null) {
        text = getRowText(cursor);
      }

      if (text) {
        void copyToClipboard(text);
      }

      setMode("cursor");
    },
    hotkey: "y",
    id: "select-copy",
    modes: ["select"],
    title: "Copy selection",
  });
};
