/**
 * Attach chooser: a fuzzy multi-select ChooseOverlay over the files in the
 * working directory. Tab marks files, Enter attaches them. With no marks,
 * Enter attaches the file under the cursor.
 */

import { useChooseDialog } from "@tooee/choose";
import type { ChooseItem } from "@tooee/choose";
import { useCallback } from "react";

import { listFileCandidates } from "./file-candidates.js";

const IMAGE_FILE = /\.(?:png|jpe?g|gif|webp)$/iu;

export const fileItem = function fileItem(file: string): ChooseItem {
  return { icon: IMAGE_FILE.test(file) ? "▣" : "≡", text: file, value: file };
};

/** Opens the chooser. Resolves with the chosen paths, or null on cancel. */
export const useFilePicker = function useFilePicker(): () => Promise<string[] | null> {
  const dialog = useChooseDialog<string>();

  return useCallback(
    async () =>
      await dialog.open({
        emptyMessage: "No files here",
        items: async () => await listFileCandidates(),
        multi: true,
        placeholder: "Filter files… (Tab marks, Enter attaches)",
        prompt: "Attach files",
        toItem: fileItem,
      }),
    [dialog]
  );
};
