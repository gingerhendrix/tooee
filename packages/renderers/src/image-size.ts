/**
 * Size terminal image boxes from image pixel dimensions.
 *
 * OpenTUI's `<image>` has no intrinsic layout size, so the caller gives it a
 * box in terminal cells. These helpers make that box match the image's own
 * pixel size, one image pixel per screen pixel, and shrink it only when it
 * does not fit the available cells. They never enlarge an image.
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

/** Cell width and aspect from the terminal's reported pixel resolution. */
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

/**
 * Terminal rows an inline image leaves free, so a full-height image still
 * shows the view chrome and some of the text around it.
 */
export const IMAGE_WINDOW_PADDING_ROWS = 6;

export interface ImageBox {
  cols: number;
  rows: number;
}

export interface NaturalImageBoxOptions {
  /** Columns the image may use. */
  maxCols: number;
  /** Rows the image may use. */
  maxRows: number;
  /**
   * Requested width in columns, in place of the pixel width. The rows follow
   * from the image aspect ratio. The box still shrinks to `maxCols` and
   * `maxRows`.
   */
  cols?: number;
  /** Rows the box uses at least. Default 1. */
  minRows?: number;
}

/** Tolerance for float error before `Math.ceil`, so 10.0000001 stays 10. */
const CEIL_EPSILON = 1e-6;

const ceilCells = function ceilCells(value: number): number {
  return Math.ceil(value - CEIL_EPSILON);
};

/**
 * Box for an image of `pixelWidth` x `pixelHeight` pixels at one image pixel
 * per screen pixel. When the box is larger than `maxCols` or `maxRows`, both
 * sides shrink by the same factor, so the box keeps the image aspect ratio and
 * `fit="fit"` fills it with no letterbox.
 */
export const naturalImageBox = function naturalImageBox(
  pixelWidth: number,
  pixelHeight: number,
  geometry: CellGeometry,
  options: NaturalImageBoxOptions
): ImageBox {
  const minRows = options.minRows ?? 1;
  const maxCols = Math.max(1, options.maxCols);
  const maxRows = Math.max(minRows, options.maxRows);

  if (pixelWidth <= 0 || pixelHeight <= 0) {
    return { cols: maxCols, rows: minRows };
  }

  // Columns covered by one row of image, at the image's own aspect ratio.
  const colsPerRow = (pixelWidth / pixelHeight) * geometry.aspect;
  const naturalCols = options.cols ?? pixelWidth / geometry.cellWidth;
  const naturalRows = naturalCols / colsPerRow;
  const scale = Math.min(1, maxCols / naturalCols, maxRows / naturalRows);

  return {
    cols: Math.min(maxCols, Math.max(1, ceilCells(naturalCols * scale))),
    rows: Math.min(maxRows, Math.max(minRows, ceilCells(naturalRows * scale))),
  };
};
