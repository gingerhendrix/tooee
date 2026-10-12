import { cellWidth, truncateCells } from "./cell-text.js";

export interface TitleBarText {
  title: string;
  /** Empty when the subtitle does not show. */
  subtitle: string;
}

/** Text between the title and the subtitle. */
export const TITLE_BAR_SEPARATOR = " — ";

const MIN_SUBTITLE_WIDTH = 8;

/**
 * Fit a title and subtitle into `width` cells. The subtitle shortens first,
 * down to 8 cells, then hides. Then the title shortens with an end ellipsis.
 */
export const fitTitleBar = function fitTitleBar(
  title: string,
  subtitle: string | undefined,
  width: number
): TitleBarText {
  const sub = subtitle ?? "";

  if (sub === "") {
    return { subtitle: "", title: truncateCells(title, width) };
  }

  const room = width - cellWidth(title) - cellWidth(TITLE_BAR_SEPARATOR);

  if (room >= Math.min(cellWidth(sub), MIN_SUBTITLE_WIDTH)) {
    return { subtitle: truncateCells(sub, room), title };
  }

  return { subtitle: "", title: truncateCells(title, width) };
};
