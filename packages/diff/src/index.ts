export { buildDiffModel, diffRowAdapter, scanPatchSections, countHunkDiffStats } from "./model.js";
export type { DiffModel, DiffRow, DiffRowKind } from "./model.js";
export { DiffView, DiffRowView, effectiveLayout, MIN_SPLIT_WIDTH } from "./diff-view.js";
export type { DiffViewProps, DiffRowViewProps, DiffRenderOptions } from "./diff-view.js";
export {
  diffCodeBlockRenderer,
  parseDiffFenceOptions,
  DIFF_CODE_BLOCK_RENDERERS,
} from "./diff-code-block.js";
export type { DiffFenceOptions } from "./diff-code-block.js";
export { resolveHunkDiffTheme, isLightBackground, HUNK_THEME_MAP } from "./theme-map.js";
export type { HunkThemePair } from "./theme-map.js";
export { isDiffPatch } from "./detect.js";
export type {
  HunkDiffFile,
  HunkDiffLayout,
  HunkDiffStats,
  HunkDiffThemeName,
} from "hunkdiff/opentui";
