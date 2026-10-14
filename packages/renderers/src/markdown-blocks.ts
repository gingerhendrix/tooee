import { marked } from "marked";
import type { Token, Tokens } from "marked";

import { narrowToken } from "./markdown/tokens.js";
import { SourceIndex } from "./source.js";
import type { DocumentRowSource } from "./source.js";

const LINE_FEED_CODE = 10;

/** Leading indent, bullet/ordinal marker, and optional checkbox on a list item's first line. */
const LIST_MARKER = /^(?<indent>\s*)(?:[-*+]|\d+[.)])[ \t]*(?:\[[ xX]\])?/u;

// ---------------------------------------------------------------------------
// Flat block model
// ---------------------------------------------------------------------------

/** Fields that every flattened block has, whatever its kind. */
interface FlatBlockBase {
  /** Columns of nesting, such as the bullet width of each parent list item. */
  indent: number;
  /** Provenance in the Markdown input; `null` only if resolution genuinely failed. */
  source: DocumentRowSource | null;
}

export interface FlatHeadingBlock extends FlatBlockBase {
  kind: "heading";
  token: Tokens.Heading;
}

export interface FlatParagraphBlock extends FlatBlockBase {
  kind: "paragraph";
  token: Tokens.Paragraph;
}

export interface FlatCodeBlock extends FlatBlockBase {
  kind: "code";
  token: Tokens.Code;
}

export interface FlatBlockquoteBlock extends FlatBlockBase {
  kind: "blockquote";
  token: Tokens.Blockquote;
}

export interface FlatRuleBlock extends FlatBlockBase {
  kind: "hr";
  token: Tokens.Hr;
}

/**
 * The first line of a list item: the bullet, an optional checkbox and the
 * item's first inline content. An item that starts with block content, or
 * has no content, gets an empty `text` token.
 */
export interface FlatListLineBlock extends FlatBlockBase {
  kind: "list-line";
  token: Tokens.Text | Tokens.Paragraph;
  bullet: string;
  /** Set on task-list items only. */
  checked?: boolean;
}

/** One header or body row of a Markdown table. A table is one block per row. */
export interface FlatTableRowBlock extends FlatBlockBase {
  kind: "table-row";
  row: FlatTableRow;
}

/** Any other block token, such as a `text` token inside a list item. */
export interface FlatOtherBlock extends FlatBlockBase {
  kind: "other";
  token: Token;
}

/**
 * A flattened block — all blocks exist at the top level with an indent.
 * Nested structures (lists containing code blocks, etc.) are flattened into
 * sibling blocks with appropriate indentation. `kind` tells readers which
 * fields the block has, so they do not need to inspect the Marked token.
 */
export type FlatBlock =
  | FlatHeadingBlock
  | FlatParagraphBlock
  | FlatCodeBlock
  | FlatBlockquoteBlock
  | FlatRuleBlock
  | FlatListLineBlock
  | FlatTableRowBlock
  | FlatOtherBlock;

export type FlatBlockKind = FlatBlock["kind"];

/**
 * One row of a Markdown table. The delimiter line (`| --- |`) is not a row.
 * Rows of the same table share `table`, so a renderer can give every row the
 * same column widths.
 */
export interface FlatTableRow {
  /** The parent table token, the same object for every row of the table. */
  table: Tokens.Table;
  /** `0` is the header row. Body rows start at `1`. */
  index: number;
  /** This row's Markdown line, without indent or line ending. */
  raw: string;
}

export interface FlattenMarkdownOptions {
  sourceId?: string;
}

/** Empty synthetic token stamped onto bullet-only rows (nested-list/block/empty items). */
const syntheticTextToken = function syntheticTextToken(): Tokens.Text {
  return { raw: "", text: "", tokens: [], type: "text" };
};

/**
 * Task-list marker for a bullet row. Rows that are not checkbox items have no
 * marker. Not re-exported from the package index — internal to the renderers.
 */
export const checkboxMarker = function checkboxMarker(checked: boolean | undefined): string {
  if (checked === undefined) {
    return "";
  }

  return checked ? "[x] " : "[ ] ";
};

/**
 * The visible/searchable text for a block. A table row uses its own Markdown
 * line. Other non-synthetic blocks use the token's `raw`; synthetic bullet rows (empty raw) fall back to the visible
 * bullet/checkbox text, then to the resolved source text. This keeps default
 * search and copy in agreement with the source mapping on synthetic rows.
 */
export const getFlatBlockText = function getFlatBlockText(block: FlatBlock): string {
  if (block.kind === "table-row") {
    return block.row.raw;
  }

  const { raw } = block.token;

  if (raw.length > 0) {
    return raw;
  }

  if (block.kind === "list-line") {
    return block.bullet + checkboxMarker(block.checked);
  }

  return block.source?.primary.text ?? "";
};

// ---------------------------------------------------------------------------
// Markdown provenance resolver
// ---------------------------------------------------------------------------

/**
 * Deterministic sequential source resolution. Marked exposes `raw` strings but
 * no positions, so we locate each token's exact slice at or after a monotonic
 * cursor, constrained to its parent list-item span. Advancing the cursor past
 * every match is what makes repeated identical blocks resolve to distinct
 * occurrences instead of backtracking to an earlier one.
 */
class MarkdownResolver {
  readonly index: SourceIndex;
  readonly markdown: string;
  cursor = 0;

  constructor(markdown: string, sourceId?: string) {
    this.markdown = markdown;
    this.index = new SourceIndex(markdown, sourceId);
  }

  /** Resolve `raw` at/after the cursor within `[cursor, bound]`, then advance. */
  resolveRaw(raw: string, bound: number): DocumentRowSource | null {
    const match = this.findRaw(raw, bound);

    if (!match) {
      return null;
    }

    this.cursor = match.end;

    return { primary: this.index.span(match.start, match.end) };
  }

  /** Find `raw`'s offset range without advancing the cursor. */
  locate(raw: string, bound: number): { start: number; end: number } | null {
    return this.findRaw(raw, bound);
  }

  /**
   * Locate `raw` at or after the cursor within `[cursor, bound]`. marked
   * normalizes `\r\n` to `\n` inside multi-line token `raw`, so the exact slice
   * can be absent from a CRLF source. When the exact scan fails we retry a
   * newline-tolerant match (a needle `\n` matches a source `\r\n` or `\n`) so
   * offsets keep addressing the original `\r\n` string without normalizing it.
   */
  private findRaw(raw: string, bound: number): { start: number; end: number } | null {
    if (raw.length === 0) {
      return null;
    }

    const md = this.markdown;

    const exact = md.indexOf(raw, this.cursor);

    if (exact !== -1 && exact + raw.length <= bound) {
      return { end: exact + raw.length, start: exact };
    }

    if (!raw.includes("\n")) {
      return null;
    }

    const firstSegment = raw.slice(0, raw.indexOf("\n"));

    if (firstSegment.length === 0) {
      return null;
    }

    let from = this.cursor;

    for (;;) {
      const start = md.indexOf(firstSegment, from);

      if (start === -1 || start >= bound) {
        return null;
      }

      const end = this.matchFlexibleNewlines(raw, start, bound);

      if (end !== -1) {
        return { end, start };
      }

      from = start + 1;
    }
  }

  /** Match `raw` from `start`, letting a needle `\n` consume a source `\r\n`. */
  private matchFlexibleNewlines(raw: string, start: number, bound: number): number {
    const md = this.markdown;
    const { length } = md;
    let h = start;
    let n = 0;

    while (n < raw.length) {
      const code = raw.codePointAt(n);

      if (code === LINE_FEED_CODE) {
        if (h + 1 < length && md.codePointAt(h) === 13 && md.codePointAt(h + 1) === 10) {
          h += 2;
        } else if (h < length && md.codePointAt(h) === 10) {
          h += 1;
        } else {
          return -1;
        }

        n += 1;
      } else if (h < length && md.codePointAt(h) === code) {
        h += 1;
        n += 1;
      } else {
        return -1;
      }
    }

    return h <= bound ? h : -1;
  }

  /** Zero-consumption marker span for a synthetic bullet on the item's first line. */
  markerSource(itemStart: number, itemEnd: number): DocumentRowSource {
    const nl = this.markdown.indexOf("\n", itemStart);
    const lineEnd = nl === -1 ? itemEnd : Math.min(nl, itemEnd);
    const firstLine = this.markdown.slice(itemStart, lineEnd);
    const match = LIST_MARKER.exec(firstLine);

    if (!match) {
      return { primary: this.index.span(itemStart, itemStart, false) };
    }

    const markerStart = itemStart + (match.groups?.indent ?? "").length;
    let spanEnd = itemStart + match[0].length;

    while (spanEnd > markerStart) {
      const code = this.markdown.codePointAt(spanEnd - 1);

      // Continue while the character is a space or tab.
      if (code !== 32 && code !== 9) {
        break;
      }

      spanEnd -= 1;
    }

    return { primary: this.index.span(markerStart, spanEnd, false) };
  }
}

// ---------------------------------------------------------------------------
// Flattening (shared by mapped and unmapped forms)
// ---------------------------------------------------------------------------

const bulletFor = function bulletFor(list: Tokens.List, itemIndex: number): string {
  return list.ordered
    ? `${itemIndex + (list.start === "" || list.start === 0 ? 1 : list.start)}. `
    : "- ";
};

/** Where flattened blocks go, and the limits for source resolution. */
interface FlattenContext {
  /** Source offset that resolution must not pass, such as the end of the parent list item. */
  bound: number;
  indent: number;
  out: FlatBlock[];
  res: MarkdownResolver | null;
}

const resolveSource = function resolveSource(
  raw: string,
  ctx: FlattenContext
): DocumentRowSource | null {
  return ctx.res ? ctx.res.resolveRaw(raw, ctx.bound) : null;
};

/**
 * The typed block for a token that is not a list, a table or HTML. This is the
 * one place that maps a Marked token type to a block `kind`.
 */
const leafBlock = function leafBlock(token: Token, base: FlatBlockBase): FlatBlock {
  const heading = narrowToken(token, "heading");

  if (heading !== null) {
    return { ...base, kind: "heading", token: heading };
  }

  const paragraph = narrowToken(token, "paragraph");

  if (paragraph !== null) {
    return { ...base, kind: "paragraph", token: paragraph };
  }

  const code = narrowToken(token, "code");

  if (code !== null) {
    return { ...base, kind: "code", token: code };
  }

  const blockquote = narrowToken(token, "blockquote");

  if (blockquote !== null) {
    return { ...base, kind: "blockquote", token: blockquote };
  }

  const hr = narrowToken(token, "hr");

  if (hr !== null) {
    return { ...base, kind: "hr", token: hr };
  }

  return { ...base, kind: "other", token };
};

/**
 * Emit one block per table row: the header, then each body row. Each row
 * resolves its own source line, so the delimiter line between the header and
 * the body stays unmapped. Lines are trimmed, because marked strips the list
 * indent from a table inside a list item but the source keeps it.
 */
const flattenTable = function flattenTable(table: Tokens.Table, ctx: FlattenContext): void {
  const lines = table.raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let index = 0; index <= table.rows.length; index += 1) {
    // Line 1 is the delimiter, so body row `index` is on line `index + 1`.
    const raw = lines[index === 0 ? 0 : index + 1] ?? "";

    ctx.out.push({
      indent: ctx.indent,
      kind: "table-row",
      row: { index, raw, table },
      source: resolveSource(raw, ctx),
    });
  }
};

/**
 * Flatten one block token at the context's indent. The top level and list
 * items share this step, so lists and tables nest the same way everywhere.
 * Block HTML is not rendered, so it gets no block. It is still resolved, so
 * later blocks keep their sequential source anchors.
 */
const flattenBlockToken = function flattenBlockToken(token: Token, ctx: FlattenContext): void {
  const list = narrowToken(token, "list");

  if (list !== null) {
    // oxlint-disable-next-line no-use-before-define -- lists and list items recurse through this step
    flattenList(list, ctx);

    return;
  }

  const table = narrowToken(token, "table");

  if (table !== null) {
    flattenTable(table, ctx);

    return;
  }

  const source = resolveSource(token.raw ?? "", ctx);

  if (token.type === "html") {
    return;
  }

  ctx.out.push(leafBlock(token, { indent: ctx.indent, source }));
};

/**
 * Flatten one list item. `ctx.bound` is the end of the item. `itemStart` is
 * its start offset, or `null` when the item was not found in the source.
 */
const flattenListItem = function flattenListItem(
  item: Tokens.ListItem,
  bullet: string,
  ctx: FlattenContext,
  itemStart: number | null
): void {
  const checked = item.checked === null ? undefined : item.checked;
  const childCtx: FlattenContext = { ...ctx, indent: ctx.indent + bullet.length };
  let bulletUsed = false;

  const pushListLine = (
    token: Tokens.Text | Tokens.Paragraph,
    source: DocumentRowSource | null
  ) => {
    ctx.out.push({ bullet, checked, indent: ctx.indent, kind: "list-line", source, token });
    bulletUsed = true;
  };

  const emitBulletMarker = () => {
    const source =
      ctx.res && itemStart !== null ? ctx.res.markerSource(itemStart, ctx.bound) : null;

    pushListLine(syntheticTextToken(), source);
  };

  for (const token of item.tokens) {
    if (token.type === "space" || token.type === "checkbox") {
      continue;
    }

    const inline = narrowToken(token, "text") ?? narrowToken(token, "paragraph");

    if (inline !== null) {
      // Inline content — attach the bullet to the first one.
      const source = resolveSource(inline.raw, ctx);

      if (bulletUsed) {
        ctx.out.push(leafBlock(inline, { indent: ctx.indent, source }));
      } else {
        pushListLine(inline, source);
      }

      continue;
    }

    // Block content (list, table, code, blockquote, hr, etc.) sits under the bullet.
    if (!bulletUsed) {
      emitBulletMarker();
    }

    flattenBlockToken(token, childCtx);
  }

  // List item had no content tokens — still emit the bullet.
  if (!bulletUsed) {
    emitBulletMarker();
  }
};

const flattenList = function flattenList(list: Tokens.List, ctx: FlattenContext): void {
  for (let i = 0; i < list.items.length; i += 1) {
    const item = list.items[i];

    let itemStart: number | null = null;
    let itemEnd = ctx.bound;

    if (ctx.res) {
      const loc = ctx.res.locate(item.raw, ctx.bound);

      if (loc) {
        itemStart = loc.start;
        itemEnd = loc.end;
        ctx.res.cursor = loc.start;
      }
    }

    flattenListItem(item, bulletFor(list, i), { ...ctx, bound: itemEnd }, itemStart);

    if (ctx.res && itemStart !== null) {
      ctx.res.cursor = itemEnd;
    }
  }
};

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/**
 * Lex, flatten, and source-map Markdown in one operation. A table becomes one
 * `table-row` block per header or body row. Every returned block
 * carries a `source` anchor (or `null` when a marked edge case leaves a token
 * genuinely unresolvable), in the exact order used for navigation/rendering.
 * Block HTML is not rendered, so it does not occupy a navigation row.
 */
export const flattenMarkdown = function flattenMarkdown(
  markdown: string,
  options?: FlattenMarkdownOptions
): FlatBlock[] {
  const ctx: FlattenContext = {
    bound: markdown.length,
    indent: 0,
    out: [],
    res: new MarkdownResolver(markdown, options?.sourceId),
  };

  for (const token of marked.lexer(markdown)) {
    if (token.type !== "space") {
      flattenBlockToken(token, ctx);
    }
  }

  return ctx.out;
};
