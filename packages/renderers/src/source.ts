import type { Key } from "react";

// ---------------------------------------------------------------------------
// Source-coordinate types
// ---------------------------------------------------------------------------

/** A point in the original source. Offsets and columns are UTF-16 code-unit indices. */
export interface SourcePoint {
  offset: number;
  line: number;
  column: number;
}

/**
 * A half-open source range: `[start, end)`.
 *
 * `start`/`end` carry the line/column of each boundary, while `lastLine` is the
 * inclusive physical line the anchor actually touches. `lastLine` avoids the
 * common error where a range ending at column 0 after a newline appears to
 * cover the following line.
 */
export interface SourceSpan {
  sourceId?: string;
  start: SourcePoint;
  end: SourcePoint;
  lastLine: number;

  /** Exact original substring in `[start.offset, end.offset)`. */
  text: string;

  /** Complete physical source lines touched by the span, without newline normalization. */
  lineText: string;
}

/** A rendered row can be synthetic, have one source, or relate two/more sources. */
export interface DocumentRowSource {
  primary: SourceSpan;
  related?: readonly SourceSpan[];
}

/** The live anchor a document controller resolves for a rendered/navigation row. */
export interface DocumentRowAnchor<T> {
  row: T;
  index: number;
  key: Key;

  /** The same semantic text used by default search and copy. */
  text: string;

  /** `null` for generated rows with no meaningful source coordinate. */
  source: DocumentRowSource | null;
}

// ---------------------------------------------------------------------------
// Line index and span construction
// ---------------------------------------------------------------------------

/** Offsets of the first character of every physical line. */
function buildLineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10 /* \n */) starts.push(i + 1);
  }
  return starts;
}

/**
 * A CRLF-aware line-start index over an original source string. A `\r\n` is one
 * line break (the break lands on the `\n`); offsets still address the original
 * `\r\n` string, so the `\r` counts as a column on the preceding line.
 */
export class SourceIndex {
  readonly lineStarts: number[];

  constructor(
    readonly text: string,
    readonly sourceId?: string,
  ) {
    this.lineStarts = buildLineStarts(text);
  }

  /** The physical line index (0-based) containing `offset`, via binary search. */
  lineAt(offset: number): number {
    const starts = this.lineStarts;
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  point(offset: number): SourcePoint {
    const line = this.lineAt(offset);
    return { offset, line, column: offset - this.lineStarts[line]! };
  }

  /** End offset of a line's content, excluding its `\n`/`\r\n` delimiter. */
  lineContentEnd(line: number): number {
    const starts = this.lineStarts;
    const nextStart = line + 1 < starts.length ? starts[line + 1]! : this.text.length;
    let end = nextStart;
    if (end > starts[line]! && this.text.charCodeAt(end - 1) === 10) {
      end--;
      if (end > starts[line]! && this.text.charCodeAt(end - 1) === 13 /* \r */) end--;
    }
    return end;
  }

  /**
   * Build a span for `[rawStart, rawEnd)`. When `trimTrailingNewlines` is set,
   * terminal `\n`/`\r\n` sequences are removed from the *display* end so the
   * inclusive `lastLine` stays on the content rather than a following blank
   * line. `text` and `lineText` preserve original characters.
   */
  span(rawStart: number, rawEnd: number, trimTrailingNewlines = true): SourceSpan {
    let end = rawEnd;
    if (trimTrailingNewlines) {
      while (end > rawStart && this.text.charCodeAt(end - 1) === 10) {
        end--;
        if (end > rawStart && this.text.charCodeAt(end - 1) === 13) end--;
      }
    }
    if (end < rawStart) {
      end = rawStart;
    }

    const start = this.point(rawStart);
    const endPoint = this.point(end);
    const lastLine = end > rawStart ? this.lineAt(end - 1) : start.line;
    const span: SourceSpan = {
      start,
      end: endPoint,
      lastLine,
      text: this.text.slice(rawStart, end),
      lineText: this.text.slice(this.lineStarts[start.line]!, this.lineContentEnd(lastLine)),
    };
    if (this.sourceId !== undefined) {
      span.sourceId = this.sourceId;
    }
    return span;
  }
}

// ---------------------------------------------------------------------------
// Source-line identity mapping (code / plain text)
// ---------------------------------------------------------------------------

export interface SourceLineRow {
  text: string;
  source: DocumentRowSource;
}

/**
 * One navigation row per physical source line. Matches the current View
 * behavior: an empty source yields one empty row, and a trailing newline yields
 * a final empty row. Each row's primary span covers the line contents but not
 * its newline delimiter; CRLF is one line break while offsets keep addressing
 * the original `\r\n` string.
 */
export function sourceLines(source: string, options?: { sourceId?: string }): SourceLineRow[] {
  const index = new SourceIndex(source, options?.sourceId);
  const rows: SourceLineRow[] = [];
  for (let line = 0; line < index.lineStarts.length; line++) {
    const start = index.lineStarts[line]!;
    const end = index.lineContentEnd(line);
    rows.push({
      text: source.slice(start, end),
      source: { primary: index.span(start, end, false) },
    });
  }
  return rows;
}

/** Adapter for `sourceLines()` rows: identity mapping in row/line space. */
export const sourceLineAdapter = {
  getText: (row: SourceLineRow): string => row.text,
  getSource: (row: SourceLineRow): DocumentRowSource => row.source,
};
