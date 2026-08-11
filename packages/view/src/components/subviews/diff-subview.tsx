import { createElement, useCallback, useMemo, useState } from "react";
import { DiffView, buildDiffModel, diffRowAdapter } from "@tooee/diff";
import type { DiffRow } from "@tooee/diff";
import { useCommand } from "@tooee/commands";
import { useConfig } from "@tooee/config";
import { useOverlay } from "@tooee/overlays";
import type { OverlayCloseReason } from "@tooee/overlays";
import { useDocumentController } from "@tooee/shell";
import type { DocumentRowAdapter } from "@tooee/shell";
import type { DiffContent } from "../../types.js";
import { useContentCommands } from "../../hooks/use-content-commands.js";
import { ViewScreen } from "../view-screen.js";
import { DiffFilePickerOverlay } from "../diff-file-picker.js";
import type { SubviewProps } from "./types.js";

interface DiffSubviewProps extends SubviewProps {
  content: DiffContent;
}

/** Columns panned per h/l press when a hunk is wider than the viewport. */
const HSCROLL_STEP = 4;

const FILE_PICKER_OVERLAY = "diff-file-picker";

/**
 * Rows are file headers and hunks, so `getText` is the row's patch text and
 * `getSource` its span in the original patch: search, copy and marks all work
 * in real patch coordinates rather than in rendered diff lines.
 */
const DIFF_ROW_ADAPTER: DocumentRowAdapter<DiffRow> = diffRowAdapter;

/**
 * The built-in diff viewer: a Hunk-rendered patch inside Tooee's normal chrome.
 *
 * Hunk owns the drawing of each file header and hunk; the row document owns
 * scrolling, the cursor, decorations and mouse routing. The cursor row maps 1:1
 * onto Hunk's `{ fileId, hunkIndex }` selection, so `j`/`k` step hunk by hunk.
 */
export const DiffSubview = function DiffSubview({
  content,
  decorations,
  actions,
  ...screen
}: DiffSubviewProps): React.ReactNode {
  const config = useConfig();
  const overlay = useOverlay();
  const textContent = content.patch;
  const model = useMemo(() => buildDiffModel(content.patch), [content.patch]);

  const [layout, setLayout] = useState<"split" | "stack">(
    content.layout ?? config.view?.diffLayout ?? "stack",
  );
  const [wrapLines, setWrapLines] = useState(config.view?.wrap ?? false);
  const [horizontalOffset, setHorizontalOffset] = useState(0);

  const { showLineNumbers } = useContentCommands({ content, textContent });

  const document = useDocumentController<DiffRow>({
    adapter: DIFF_ROW_ADAPTER,
    // The controller projects the screen's actions onto menu entries at open time.
    contextMenu: actions,
    decorations,
    multiSelect: true,
    preserveCursorByKey: true,
    rows: model.rows,
  });

  const { activeIndex } = document;
  // `setCursor` rather than `selectRow`: the latter stands down while a modal
  // overlay is open, which is exactly when the file picker commits its choice.
  const { setCursor } = document.navigation;

  /** Index of the file-header row for `fileIndex`, or `null` when absent. */
  const fileRowIndex = useCallback(
    (fileIndex: number): number | null => {
      const index = model.rows.findIndex(
        (row) => row.kind === "file" && row.fileIndex === fileIndex,
      );
      return index === -1 ? null : index;
    },
    [model.rows],
  );

  const jumpFile = useCallback(
    (delta: number) => {
      const current = activeIndex === null ? undefined : model.rows[activeIndex];
      const from = current?.fileIndex ?? 0;
      const target = Math.min(Math.max(from + delta, 0), model.files.length - 1);
      const index = fileRowIndex(target);
      if (index !== null) {
        setCursor(index);
      }
    },
    [activeIndex, fileRowIndex, model.files.length, model.rows, setCursor],
  );

  useCommand({
    handler: () => {
      setLayout((value) => (value === "split" ? "stack" : "split"));
    },
    hotkey: "s",
    id: "diff.toggle-layout",
    modes: ["cursor", "select"],
    title: "Toggle split/unified diff",
  });
  useCommand({
    handler: () => {
      setWrapLines((value) => !value);
      setHorizontalOffset(0);
    },
    hotkey: "w",
    id: "diff.toggle-wrap",
    modes: ["cursor", "select"],
    title: "Toggle diff line wrapping",
  });
  useCommand({
    handler: () => {
      jumpFile(1);
    },
    hotkey: "]",
    id: "diff.next-file",
    modes: ["cursor", "select"],
    title: "Next file",
  });
  useCommand({
    handler: () => {
      jumpFile(-1);
    },
    hotkey: "[",
    id: "diff.prev-file",
    modes: ["cursor", "select"],
    title: "Previous file",
  });
  useCommand({
    handler: () => {
      setHorizontalOffset((value) => Math.max(0, value - HSCROLL_STEP));
    },
    hotkey: "h",
    id: "diff.scroll-left",
    modes: ["cursor"],
    title: "Pan diff left",
    when: () => !wrapLines,
  });
  useCommand({
    handler: () => {
      setHorizontalOffset((value) => value + HSCROLL_STEP);
    },
    hotkey: "l",
    id: "diff.scroll-right",
    modes: ["cursor"],
    title: "Pan diff right",
    when: () => !wrapLines,
  });
  useCommand({
    handler: () => {
      overlay.open(
        FILE_PICKER_OVERLAY,
        ({ close }: { close: (reason?: OverlayCloseReason) => void }) =>
          createElement(DiffFilePickerOverlay, {
            close: () => {
              close();
            },
            files: model.files,
            onSelect: (fileIndex: number) => {
              const index = fileRowIndex(fileIndex);
              if (index !== null) {
                setCursor(index);
              }
            },
          }),
        null,
        { ownCommands: true, role: "modal", surfaceMode: "insert" },
      );
    },
    hotkey: "f",
    id: "diff.file-picker",
    modes: ["cursor", "select"],
    title: "Go to file",
  });

  const activeRow = activeIndex === null ? undefined : model.rows[activeIndex];
  const statusItems = useMemo(
    () => [
      { label: "Format:", value: content.format },
      { label: "Files:", value: String(model.files.length) },
      { label: "Changes:", value: `+${model.stats.additions} -${model.stats.deletions}` },
      { label: "Layout:", value: layout },
      ...(activeRow
        ? [
            {
              label: "At:",
              value:
                activeRow.hunkIndex >= 0
                  ? `${activeRow.parent.path ?? activeRow.fileId}:${activeRow.hunkIndex + 1}`
                  : (activeRow.parent.path ?? activeRow.fileId),
            },
          ]
        : []),
    ],
    [
      activeRow,
      content.format,
      layout,
      model.files.length,
      model.stats.additions,
      model.stats.deletions,
    ],
  );

  return (
    <ViewScreen
      content={content}
      controller={document}
      actions={actions}
      statusItems={statusItems}
      {...screen}
    >
      <DiffView
        rows={model.rows}
        document={document}
        activeIndex={activeIndex}
        showLineNumbers={showLineNumbers}
        layout={layout}
        wrapLines={wrapLines}
        horizontalOffset={horizontalOffset}
      />
    </ViewScreen>
  );
};
