import { useMemo } from "react";
import type { ReactNode } from "react";
import { useTerminalDimensions } from "@opentui/react";
import { HunkDiffBody, HunkDiffFileHeader } from "hunkdiff/opentui";
import type { HunkDiffLayout, HunkDiffThemeName } from "hunkdiff/opentui";
import { useTheme } from "@tooee/themes";
import {
  DEFAULT_SIGN_COLUMN_WIDTH,
  computeRowDocumentGutterWidth,
  useGutterPalette,
} from "@tooee/renderers";
import type { DocumentBindings } from "@tooee/renderers";
import "@tooee/renderers/row-document";
import type { DiffRow } from "./model.js";
import { resolveHunkDiffTheme } from "./theme-map.js";

/**
 * Narrowest content width a split layout stays readable at. Below it, split
 * falls back to stack so a narrow terminal shows whole lines instead of two
 * unusable columns.
 */
export const MIN_SPLIT_WIDTH = 80;

/** Columns held back from the measured width for the scrollbar and right edge. */
const SCROLLBAR_RESERVE = 2;

export interface DiffRenderOptions {
  layout?: HunkDiffLayout;
  /** Line-number columns inside each hunk (Hunk's own gutter). */
  showHunkLineNumbers?: boolean;
  showHunkHeaders?: boolean;
  wrapLines?: boolean;
  horizontalOffset?: number;
  /** Word-level intra-line highlighting. */
  highlight?: boolean;
  tabWidth?: number;
  /** Overrides the theme derived from the active Tooee theme. */
  theme?: HunkDiffThemeName;
}

export interface DiffRowViewProps extends DiffRenderOptions {
  row: DiffRow;
  width: number;
  theme: HunkDiffThemeName;
  /** Draws Hunk's selected-hunk styling under the document cursor. */
  active?: boolean;
}

/** Split falls back to stack when the content area is too narrow for two columns. */
export const effectiveLayout = function effectiveLayout(
  layout: HunkDiffLayout | undefined,
  width: number,
): HunkDiffLayout {
  return layout === "split" && width < MIN_SPLIT_WIDTH ? "stack" : (layout ?? "stack");
};

/**
 * One diff row. File rows render Hunk's compact header; hunk and body rows
 * render a Hunk body — for hunk rows the file model is already narrowed to a
 * single hunk, so exactly one hunk is drawn.
 */
export const DiffRowView = function DiffRowView({
  row,
  width,
  theme,
  active = false,
  layout,
  showHunkLineNumbers = true,
  showHunkHeaders = true,
  wrapLines = false,
  horizontalOffset = 0,
  highlight = true,
  tabWidth,
}: DiffRowViewProps): ReactNode {
  if (row.kind === "file") {
    return <HunkDiffFileHeader file={row.file} width={width} theme={theme} />;
  }

  return (
    <HunkDiffBody
      file={row.file}
      width={width}
      theme={theme}
      layout={effectiveLayout(layout, width)}
      showLineNumbers={showHunkLineNumbers}
      showHunkHeaders={showHunkHeaders}
      wrapLines={wrapLines}
      horizontalOffset={horizontalOffset}
      highlight={highlight}
      tabWidth={tabWidth}
      selectedHunkIndex={active && row.kind === "hunk" ? 0 : undefined}
    />
  );
};

export interface DiffViewProps extends DiffRenderOptions {
  rows: readonly DiffRow[];
  /** Controller bindings: scroll follow, decorations and row mouse handling. */
  document?: DocumentBindings;
  /** Row-document gutter (Tooee's row numbers), not Hunk's line numbers. */
  showLineNumbers?: boolean;
  /** Row index under the cursor, so the active hunk can be styled. */
  activeIndex?: number | null;
  /** Overrides the measured content width; mainly for tests. */
  width?: number;
}

/**
 * The scrolling diff document: one `row-document` row per file header and per
 * hunk, each drawn by Hunk.
 *
 * The row document is the single scroll owner — Hunk's public primitives bring
 * no scrolling of their own — so the cursor, search decorations, marks and
 * scroll-follow all keep working over diff rows.
 */
export const DiffView = function DiffView({
  rows,
  document,
  showLineNumbers = true,
  activeIndex = null,
  width,
  ...render
}: DiffViewProps): ReactNode {
  const { theme, name: themeName } = useTheme();
  const palette = useGutterPalette();
  const { width: terminalWidth } = useTerminalDimensions();

  const gutterWidth = useMemo(
    () =>
      computeRowDocumentGutterWidth({
        rowCount: rows.length,
        showLineNumbers,
        signColumnWidth: DEFAULT_SIGN_COLUMN_WIDTH,
      }),
    [rows.length, showLineNumbers],
  );
  const contentWidth = Math.max(1, width ?? terminalWidth - gutterWidth - SCROLLBAR_RESERVE);

  const hunkTheme = render.theme ?? resolveHunkDiffTheme(themeName, theme);

  return (
    <row-document
      ref={document?.ref}
      showLineNumbers={showLineNumbers}
      palette={palette}
      decorations={document?.decorations}
      signColumnWidth={DEFAULT_SIGN_COLUMN_WIDTH}
      style={{ flexGrow: 1 }}
      onMouseDown={document?.onMouseDown}
    >
      {rows.map(
        (row, index): ReactNode => (
          <box key={row.key}>
            <DiffRowView
              {...render}
              row={row}
              width={contentWidth}
              theme={hunkTheme}
              active={index === activeIndex}
            />
          </box>
        ),
      )}
    </row-document>
  );
};
