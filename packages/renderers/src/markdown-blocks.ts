import { marked } from "marked";
import type { Token, Tokens } from "marked";
import { SourceIndex } from "./source.js";
import type { DocumentRowSource } from "./source.js";

const LINE_FEED_CODE = 10;

// ---------------------------------------------------------------------------
// Flat block model
// ---------------------------------------------------------------------------

/**
 * A flattened block — all blocks exist at the top level with an indent.
 * Nested structures (lists containing code blocks, etc.) are flattened into
 * sibling blocks with appropriate indentation.
 */
export interface FlatBlock {
  token: Token;
  indent: number;
  bullet?: string;
  checked?: boolean;

  /** Provenance in the Markdown input; `null` only if resolution genuinely failed. */
  source: DocumentRowSource | null;
}

export interface FlattenMarkdownOptions {
  sourceId?: string;
}

/** Empty synthetic token stamped onto bullet-only rows (nested-list/block/empty items). */
const syntheticTextToken = function syntheticTextToken(): Token {
  return { raw: "", text: "", tokens: [], type: "text" };
};

/**
 * The visible/searchable text for a block. Non-synthetic blocks use the token's
 * `raw`; synthetic bullet rows (empty raw) fall back to the visible
 * bullet/checkbox text, then to the resolved source text. This keeps default
 * search and copy in agreement with the source mapping on synthetic rows.
 */
export const getFlatBlockText = function getFlatBlockText(block: FlatBlock): string {
  const raw = "raw" in block.token && typeof block.token.raw === "string" ? block.token.raw : "";
  if (raw.length > 0) {
    return raw;
  }
  if (block.bullet !== undefined) {
    const checkbox = block.checked !== undefined ? (block.checked ? "[x] " : "[ ] ") : "";
    return block.bullet + checkbox;
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
  cursor = 0;

  constructor(
    readonly markdown: string,
    sourceId?: string,
  ) {
    this.index = new SourceIndex(markdown, sourceId);
  }

  /** Resolve `raw` at/after the cursor within `[cursor, bound]`, then advance. */
  resolveRaw(raw: string, bound: number): DocumentRowSource | null {
    const match = this.find(raw, bound);
    if (!match) {
      return null;
    }
    this.cursor = match.end;
    return { primary: this.index.span(match.start, match.end) };
  }

  /** Find `raw`'s offset range without advancing the cursor. */
  locate(raw: string, bound: number): { start: number; end: number } | null {
    return this.find(raw, bound);
  }

  /**
   * Locate `raw` at or after the cursor within `[cursor, bound]`. marked
   * normalizes `\r\n` to `\n` inside multi-line token `raw`, so the exact slice
   * can be absent from a CRLF source. When the exact scan fails we retry a
   * newline-tolerant match (a needle `\n` matches a source `\r\n` or `\n`) so
   * offsets keep addressing the original `\r\n` string without normalizing it.
   */
  private find(raw: string, bound: number): { start: number; end: number } | null {
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
      const code = raw.charCodeAt(n);
      if (code === LINE_FEED_CODE) {
        if (h + 1 < length && md.charCodeAt(h) === 13 && md.charCodeAt(h + 1) === 10) {
          h += 2;
        } else if (h < length && md.charCodeAt(h) === 10) {
          h += 1;
        } else {
          return -1;
        }
        n += 1;
      } else {
        if (h < length && md.charCodeAt(h) === code) {
          h += 1;
          n += 1;
        } else {
          return -1;
        }
      }
    }
    return h <= bound ? h : -1;
  }

  /** Zero-consumption marker span for a synthetic bullet on the item's first line. */
  markerSource(itemStart: number, itemEnd: number): DocumentRowSource {
    const nl = this.markdown.indexOf("\n", itemStart);
    const lineEnd = nl === -1 ? itemEnd : Math.min(nl, itemEnd);
    const firstLine = this.markdown.slice(itemStart, lineEnd);
    const match = firstLine.match(/^(\s*)(?:[-*+]|\d+[.)])[ \t]*(?:\[[ xX]\])?/u);
    if (!match) {
      return { primary: this.index.span(itemStart, itemStart, false) };
    }
    const markerStart = itemStart + match[1].length;
    let spanEnd = itemStart + match[0].length;
    while (spanEnd > markerStart) {
      const code = this.markdown.charCodeAt(spanEnd - 1);
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

const flattenList = function flattenList(
  list: Tokens.List,
  indent: number,
  out: FlatBlock[],
  res: MarkdownResolver | null,
  bound: number,
): void {
  for (let i = 0; i < list.items.length; i += 1) {
    const item = list.items[i];
    const bullet = bulletFor(list, i);

    let itemStart: number | null = null;
    let itemEnd = bound;
    if (res) {
      const loc = res.locate(item.raw, bound);
      if (loc) {
        itemStart = loc.start;
        itemEnd = loc.end;
        res.cursor = loc.start;
      }
    }

    // oxlint-disable-next-line no-use-before-define -- Deferred(lint-sweep): preserve deliberate top-down list flattening organization
    flattenListItem(item, indent, bullet, out, res, itemStart, itemEnd);

    if (res && itemStart !== null) {
      res.cursor = itemEnd;
    }
  }
};

const flattenListItem = function flattenListItem(
  item: Tokens.ListItem,
  indent: number,
  bullet: string,
  out: FlatBlock[],
  res: MarkdownResolver | null,
  itemStart: number | null,
  itemEnd: number,
): void {
  const checked = item.checked === null ? undefined : item.checked;
  const childTokens = item.tokens;
  let bulletUsed = false;

  const emitBulletMarker = () => {
    out.push({
      bullet,
      checked,
      indent,
      source: res && itemStart !== null ? res.markerSource(itemStart, itemEnd) : null,
      token: syntheticTextToken(),
    });
    bulletUsed = true;
  };

  for (const token of childTokens) {
    if (token.type === "space" || token.type === "checkbox") {
      continue;
    }

    if (token.type === "text" || token.type === "paragraph") {
      // Inline content — attach the bullet to the first one.
      out.push({
        bullet: bulletUsed ? undefined : bullet,
        checked: bulletUsed ? undefined : checked,
        indent,
        source: res ? res.resolveRaw(token.raw ?? "", itemEnd) : null,
        token,
      });
      bulletUsed = true;
    } else if (token.type === "list") {
      if (!bulletUsed) {
        emitBulletMarker();
      }
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Deferred(lint-sweep): marked token narrowing; schema-based validation in a later sweep
      flattenList(token as Tokens.List, indent + bullet.length, out, res, itemEnd);
    } else {
      // Block content (code, table, blockquote, hr, etc.).
      if (!bulletUsed) {
        emitBulletMarker();
      }
      out.push({
        indent: indent + bullet.length,
        source: res ? res.resolveRaw(token.raw ?? "", itemEnd) : null,
        token,
      });
    }
  }

  // List item had no content tokens — still emit the bullet.
  if (!bulletUsed) {
    emitBulletMarker();
  }
};

const flattenWalk = function flattenWalk(
  tokens: Token[],
  indent: number,
  out: FlatBlock[],
  res: MarkdownResolver | null,
  bound: number,
): void {
  for (const token of tokens) {
    if (token.type === "space") {
      continue;
    }
    if (token.type === "list") {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Deferred(lint-sweep): marked token narrowing; schema-based validation in a later sweep
      flattenList(token as Tokens.List, indent, out, res, bound);
    } else {
      out.push({ indent, source: res ? res.resolveRaw(token.raw ?? "", bound) : null, token });
    }
  }
};

// ---------------------------------------------------------------------------
// Public entry points
// ---------------------------------------------------------------------------

/**
 * Lex, flatten, and source-map Markdown in one operation. Every returned block
 * carries a `source` anchor (or `null` when a marked edge case leaves a token
 * genuinely unresolvable), in the exact order used for navigation/rendering.
 */
export const flattenMarkdown = function flattenMarkdown(
  markdown: string,
  options?: FlattenMarkdownOptions,
): FlatBlock[] {
  const res = new MarkdownResolver(markdown, options?.sourceId);
  const out: FlatBlock[] = [];
  flattenWalk(marked.lexer(markdown), 0, out, res, markdown.length);
  return out;
};

/**
 * The unmapped low-level form: flatten already-lexed tokens with no source
 * provenance (every block's `source` is `null`).
 *
 * @deprecated Prefer `flattenMarkdown(source)` for source-backed rows. Tokens
 * carry no positions and the original source is unavailable here, so offsets
 * cannot be reconstructed.
 */
export const flattenTokens = function flattenTokens(tokens: Token[]): FlatBlock[] {
  const out: FlatBlock[] = [];
  flattenWalk(tokens, 0, out, null, 0);
  return out;
};
