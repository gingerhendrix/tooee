import { useMemo } from "react";
import type { ReactNode } from "react";
import type { HunkDiffLayout } from "hunkdiff/opentui";
import { CodeBlockChrome } from "@tooee/renderers";
import type { CodeBlockRenderer, CodeBlockRendererProps } from "@tooee/renderers";
import { useTheme } from "@tooee/themes";
import { buildDiffModel } from "./model.js";
import { DiffRowView, effectiveLayout } from "./diff-view.js";
import { resolveHunkDiffTheme } from "./theme-map.js";

/** Options a fence info string can carry after the fence type. */
export interface DiffFenceOptions {
  layout: HunkDiffLayout;
  showLineNumbers: boolean;
  wrapLines: boolean;
}

/**
 * Read fence options from the info string, e.g. ```` ```diff split nolines ````.
 *
 * Unknown words are ignored so ordinary info strings (a filename, say) still
 * render.
 */
export const parseDiffFenceOptions = function parseDiffFenceOptions(
  info: string,
): DiffFenceOptions {
  const words = new Set(
    info
      .trim()
      .split(/\s+/u)
      .slice(1)
      .map((word) => word.toLowerCase()),
  );
  return {
    layout: words.has("split") ? "split" : "stack",
    showLineNumbers: !words.has("nolines"),
    wrapLines: words.has("wrap"),
  };
};

/**
 * Renders ```` ```diff ```` and ```` ```patch ```` fences as Hunk diff blocks.
 *
 * The fence stays one Markdown block, so the document cursor, search and copy
 * still treat it as a unit over the raw fence text; only its drawing changes.
 * Fence bodies that are not parseable unified diffs return `null`, which falls
 * back to the default syntax-highlighted code block — today's behaviour.
 */
const DiffCodeBlock = function DiffCodeBlock({
  text,
  info,
  width,
  indent,
}: CodeBlockRendererProps): ReactNode {
  const { theme, name: themeName } = useTheme();
  const model = useMemo(() => {
    try {
      return buildDiffModel(text);
    } catch {
      return null;
    }
  }, [text]);
  const options = useMemo(() => parseDiffFenceOptions(info), [info]);

  // A ```diff fence is often prose-style +/- lines with no hunk headers. Only
  // real unified diffs render as Hunk blocks; the rest fall back.
  if (!model || !model.rows.some((row) => row.kind === "hunk")) {
    return null;
  }

  const hunkTheme = resolveHunkDiffTheme(themeName, theme);
  const blockWidth = Math.max(1, width);
  // A single-file fence needs no file header: the fence is the file.
  const rows =
    model.files.length > 1 ? model.rows : model.rows.filter((row) => row.kind !== "file");

  return (
    <CodeBlockChrome theme={theme} indent={indent}>
      {rows.map(
        (row): ReactNode => (
          <DiffRowView
            key={row.key}
            row={row}
            width={blockWidth}
            theme={hunkTheme}
            layout={effectiveLayout(options.layout, blockWidth)}
            showHunkLineNumbers={options.showLineNumbers}
            wrapLines={options.wrapLines}
          />
        ),
      )}
    </CodeBlockChrome>
  );
};

export const diffCodeBlockRenderer: CodeBlockRenderer = DiffCodeBlock;

/** Fence types `diffCodeBlockRenderer` is registered for. */
export const DIFF_CODE_BLOCK_RENDERERS: Record<string, CodeBlockRenderer> = {
  diff: diffCodeBlockRenderer,
  patch: diffCodeBlockRenderer,
};
