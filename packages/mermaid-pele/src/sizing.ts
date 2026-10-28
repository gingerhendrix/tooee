/**
 * Size an image box in terminal cells from an SVG size and the cell geometry.
 *
 * OpenTUI fits the image inside the box. The box itself must have a fixed
 * row count, because the Markdown layout needs a height before the image
 * loads. The row count comes from the SVG aspect ratio and the cell aspect
 * ratio (cell height over cell width in pixels). Only the available columns
 * limit the box by default. The row count has no cap unless the caller sets
 * `maxRows`.
 */

export interface CellGeometry {
  /** Cell width in pixels. */
  cellWidth: number;
  /** Cell height over cell width. OpenTUI assumes 2 when it is unknown. */
  aspect: number;
}

export interface PixelResolutionSource {
  resolution: { width: number; height: number } | null;
  terminalWidth: number;
  terminalHeight: number;
}

/** Cell geometry when the terminal does not report its pixel size. */
export const DEFAULT_CELL_GEOMETRY: CellGeometry = { aspect: 2, cellWidth: 9 };

export const cellGeometry = function cellGeometry(source: PixelResolutionSource): CellGeometry {
  const { resolution, terminalWidth, terminalHeight } = source;

  if (resolution === null || terminalWidth <= 0 || terminalHeight <= 0) {
    return DEFAULT_CELL_GEOMETRY;
  }

  const cellWidth = resolution.width / terminalWidth;
  const cellHeight = resolution.height / terminalHeight;

  if (cellWidth <= 0 || cellHeight <= 0) {
    return DEFAULT_CELL_GEOMETRY;
  }

  return { aspect: cellHeight / cellWidth, cellWidth };
};

export interface ImageBox {
  cols: number;
  rows: number;
}

export interface ImageBoxOptions {
  /** Columns the block may use. */
  maxCols: number;
  /**
   * Rows a single diagram may use before it shrinks to fit. Default: no cap,
   * so a tall diagram keeps its natural height and the view scrolls.
   */
  maxRows?: number;
  /** Rows a diagram uses at least, so tiny diagrams stay visible. */
  minRows?: number;
}

/**
 * Show the SVG at about one CSS pixel per screen pixel, then shrink it to the
 * available columns and, when set, the row cap. The ratio of the box always matches the
 * SVG, so `fit="fit"` fills the box with no letterbox.
 */
export const imageBoxSize = function imageBoxSize(
  svgWidth: number,
  svgHeight: number,
  geometry: CellGeometry,
  options: ImageBoxOptions
): ImageBox {
  const minRows = options.minRows ?? 3;

  if (svgWidth <= 0 || svgHeight <= 0) {
    return { cols: Math.max(1, options.maxCols), rows: minRows };
  }

  // Columns covered by one row of image, at the SVG's own aspect ratio.
  const colsPerRow = (svgWidth / svgHeight) * geometry.aspect;
  const naturalCols = Math.ceil(svgWidth / geometry.cellWidth);
  let cols = Math.max(1, Math.min(options.maxCols, naturalCols));
  let rows = Math.ceil(cols / colsPerRow);

  if (options.maxRows !== undefined && rows > options.maxRows) {
    rows = options.maxRows;
    cols = Math.max(1, Math.min(cols, Math.round(rows * colsPerRow)));
  }

  return { cols, rows: Math.max(minRows, rows) };
};
