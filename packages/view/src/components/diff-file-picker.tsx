import type { ReactNode } from "react";
import { CommandPalette } from "@tooee/renderers";
import type { HunkDiffFile } from "@tooee/diff";

export interface DiffFilePickerOverlayProps {
  files: readonly HunkDiffFile[];
  onSelect: (fileIndex: number) => void;
  close: () => void;
}

/**
 * Fuzzy file picker for a diff. Entries are indexed by position so two files
 * with the same path (a rename pair, say) still resolve to distinct rows.
 */
export const DiffFilePickerOverlay = function DiffFilePickerOverlay({
  files,
  onSelect,
  close,
}: DiffFilePickerOverlayProps): ReactNode {
  const entries = files.map((file, index) => ({
    id: String(index),
    title: `${file.previousPath === undefined ? "" : `${file.previousPath} -> `}${
      file.path ?? file.id
    }  +${file.stats.additions} -${file.stats.deletions}`,
  }));

  return (
    <CommandPalette
      commands={entries}
      onClose={close}
      onSelect={(id: string) => {
        onSelect(Number(id));
        close();
      }}
    />
  );
};
