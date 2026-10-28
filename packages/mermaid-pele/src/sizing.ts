/**
 * Size an image box in terminal cells from an SVG size and the cell geometry.
 *
 * OpenTUI fits the image inside the box. The box itself must have a fixed
 * row count, because the Markdown layout needs a height before the image
 * loads. The box follows the SVG's CSS size through `naturalImageBox` from
 * `@tooee/renderers`, which also owns the cell geometry helpers.
 */

import { naturalImageBox } from "@tooee/renderers";
import type { CellGeometry, ImageBox } from "@tooee/renderers";

export { cellGeometry, DEFAULT_CELL_GEOMETRY } from "@tooee/renderers";

export type { CellGeometry, ImageBox, PixelResolutionSource } from "@tooee/renderers";

export interface ImageBoxOptions {
  /** Columns the block may use. */
  maxCols: number;
  /** Rows a single diagram may use before it shrinks to fit. */
  maxRows: number;
  /** Rows a diagram uses at least, so tiny diagrams stay visible. */
  minRows?: number;
}

/**
 * Show the SVG at about one CSS pixel per screen pixel, then shrink it to the
 * available columns and the row cap. The ratio of the box always matches the
 * SVG, so `fit="fit"` fills the box with no letterbox.
 */
export const imageBoxSize = function imageBoxSize(
  svgWidth: number,
  svgHeight: number,
  geometry: CellGeometry,
  options: ImageBoxOptions
): ImageBox {
  return naturalImageBox(svgWidth, svgHeight, geometry, {
    maxCols: options.maxCols,
    maxRows: options.maxRows,
    minRows: options.minRows ?? 3,
  });
};
