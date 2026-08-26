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
    handler: (ctx) => {
      const text = cursor === null ? "" : getRowText(cursor);
      if (text) {
        void copyToClipboard(text);
        ctx.toast.toast({ level: "success", message: "Copied line to clipboard" });
      } else {
        ctx.toast.toast({ level: "warning", message: "Nothing to copy" });
      }
    },
    hotkey: "y y",
    id: "copy-line",
    modes: ["cursor", "select"],
    title: "Copy current line",
  });

  useCommand({
    enabled,
    handler: (ctx) => {
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
      }

      if (text) {
        void copyToClipboard(text);
        ctx.toast.toast({ level: "success", message: "Copied selection to clipboard" });
      } else {
        ctx.toast.toast({ level: "warning", message: "Nothing selected" });
      }

      setMode("cursor");
    },
    hotkey: "y v",
    id: "copy-selection",
    modes: ["cursor", "select"],
    title: "Copy selection",
  });
};
