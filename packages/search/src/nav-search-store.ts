import { createStore } from "@xstate/store";
import type { Mode } from "@tooee/commands";

export type RowKey = string | number | bigint;
export type SearchStatus = "idle" | "editing" | "committed";

export interface NavSearchContext {
  rowKeys: readonly RowKey[];
  cursor: number | null;
  selectionAnchor: number | null;
  toggledKeys: ReadonlySet<RowKey>;
  search: {
    status: SearchStatus;
    query: string;
    committedQuery: string;
    matches: readonly number[];
    currentMatchIndex: number;
    preSearchMode: Mode;
  };
}

export interface NavSearchDeps {
  isSelectable(index: number): boolean;
}

export type NavSearchEvents = {
  rowsChanged: { keys: readonly RowKey[]; preserveCursorByKey?: boolean };
  move: { delta: number };
  jump: { index: number; direction: 1 | -1 };
  setCursor: { index: number };
  enterSelect: {};
  cancelSelect: {};
  toggleCurrent: {};
  toggleAndMove: { delta: number };
  searchStarted: { mode: Mode };
  searchChanged: { query: string; matches: readonly number[] };
  searchSubmitted: {};
  searchCancelled: {};
  searchNext: {};
  searchPrevious: {};
};

type NavSearchEmitted = {
  restoreMode: { mode: Mode };
  jumped: { index: number };
};

export const resolveIndex = function resolveIndex(
  target: number,
  direction: 1 | -1,
  rowCount: number,
  isSelectable: (index: number) => boolean,
): number | null {
  if (rowCount <= 0) {
    return null;
  }
  const max = rowCount - 1;
  const clamped = Math.max(0, Math.min(target, max));
  if (isSelectable(clamped)) {
    return clamped;
  }
  for (
    let index = clamped + direction;
    direction === 1 ? index <= max : index >= 0;
    index += direction
  ) {
    if (isSelectable(index)) {
      return index;
    }
  }
  for (
    let index = clamped - direction;
    direction === 1 ? index >= 0 : index <= max;
    index -= direction
  ) {
    if (isSelectable(index)) {
      return index;
    }
  }
  return null;
};

const EMPTY_KEYS: readonly RowKey[] = [];

export const createNavSearchStore = function createNavSearchStore(
  options: {
    keys?: readonly RowKey[];
    deps?: NavSearchDeps;
  } = {},
) {
  const deps = options.deps ?? { isSelectable: () => true };
  const keys = options.keys ?? EMPTY_KEYS;
  const resolve = (index: number, direction: 1 | -1, count = keys.length) =>
    resolveIndex(index, direction, count, deps.isSelectable);

  return createStore<NavSearchContext, NavSearchEvents, NavSearchEmitted>({
    context: {
      cursor: resolve(0, 1),
      rowKeys: keys,
      search: {
        committedQuery: "",
        currentMatchIndex: 0,
        matches: [],
        preSearchMode: "cursor",
        query: "",
        status: "idle",
      },
      selectionAnchor: null,
      toggledKeys: new Set(),
    },
    on: {
      cancelSelect: (ctx) =>
        ctx.selectionAnchor === null ? ctx : { ...ctx, selectionAnchor: null },
      enterSelect: (ctx) => ({ ...ctx, selectionAnchor: ctx.cursor }),
      jump: (ctx, event) => ({
        ...ctx,
        cursor: resolveIndex(event.index, event.direction, ctx.rowKeys.length, deps.isSelectable),
      }),
      move: (ctx, event) => {
        if (ctx.cursor === null) {
          return ctx;
        }
        const direction: 1 | -1 = event.delta < 0 ? -1 : 1;
        const cursor = resolveIndex(
          ctx.cursor + event.delta,
          direction,
          ctx.rowKeys.length,
          deps.isSelectable,
        );
        return cursor === null || cursor === ctx.cursor ? ctx : { ...ctx, cursor };
      },
      rowsChanged: (ctx, event) => {
        const previousKey = ctx.cursor === null ? undefined : ctx.rowKeys[ctx.cursor];
        let cursor = ctx.cursor;
        if (event.keys.length === 0) {
          cursor = null;
        } else if (event.preserveCursorByKey === true && previousKey !== undefined) {
          const preserved = event.keys.indexOf(previousKey);
          cursor =
            preserved >= 0
              ? resolveIndex(preserved, 1, event.keys.length, deps.isSelectable)
              : resolveIndex(
                  Math.min(ctx.cursor!, event.keys.length - 1),
                  1,
                  event.keys.length,
                  deps.isSelectable,
                );
        } else if (cursor === null || cursor >= event.keys.length) {
          cursor = resolveIndex(
            cursor === null ? 0 : event.keys.length - 1,
            cursor === null ? 1 : -1,
            event.keys.length,
            deps.isSelectable,
          );
        } else if (!deps.isSelectable(cursor)) {
          cursor = resolveIndex(cursor, 1, event.keys.length, deps.isSelectable);
        }
        const available = new Set(event.keys);
        const filtered = new Set([...ctx.toggledKeys].filter((key) => available.has(key)));
        const toggledKeys = filtered.size === ctx.toggledKeys.size ? ctx.toggledKeys : filtered;
        return { ...ctx, cursor, rowKeys: event.keys, toggledKeys };
      },
      searchCancelled: (ctx, _event, enqueue) => {
        enqueue.emit.restoreMode({ mode: ctx.search.preSearchMode });
        return {
          ...ctx,
          search: {
            ...ctx.search,
            committedQuery: "",
            currentMatchIndex: 0,
            matches: [],
            query: "",
            status: "idle",
          },
        };
      },
      searchChanged: (ctx, event, enqueue) => {
        const first = event.matches[0];
        if (first !== undefined) {
          enqueue.emit.jumped({ index: first });
        }
        return {
          ...ctx,
          cursor:
            first === undefined
              ? ctx.cursor
              : resolveIndex(first, 1, ctx.rowKeys.length, deps.isSelectable),
          search: {
            ...ctx.search,
            currentMatchIndex: 0,
            matches: event.matches,
            query: event.query,
          },
        };
      },
      searchNext: (ctx, _event, enqueue) => searchStep(ctx, 1, enqueue),
      searchPrevious: (ctx, _event, enqueue) => searchStep(ctx, -1, enqueue),
      searchStarted: (ctx, event) => ({
        ...ctx,
        search: {
          ...ctx.search,
          currentMatchIndex: 0,
          matches: [],
          preSearchMode: event.mode,
          query: "",
          status: "editing",
        },
      }),
      searchSubmitted: (ctx, _event, enqueue) => {
        const first = ctx.search.matches[0];
        if (first !== undefined) {
          enqueue.emit.jumped({ index: first });
        }
        enqueue.emit.restoreMode({ mode: ctx.search.preSearchMode });
        return {
          ...ctx,
          cursor:
            first === undefined
              ? ctx.cursor
              : resolveIndex(first, 1, ctx.rowKeys.length, deps.isSelectable),
          search: {
            ...ctx.search,
            committedQuery: ctx.search.query,
            currentMatchIndex: 0,
            status: "committed",
          },
        };
      },
      setCursor: (ctx, event) => {
        const direction: 1 | -1 = ctx.cursor !== null && event.index < ctx.cursor ? -1 : 1;
        const cursor = resolveIndex(event.index, direction, ctx.rowKeys.length, deps.isSelectable);
        return cursor === null ? ctx : { ...ctx, cursor };
      },
      toggleAndMove: (ctx, event) => {
        const toggled = toggle(ctx);
        if (toggled.cursor === null) {
          return toggled;
        }
        const direction: 1 | -1 = event.delta < 0 ? -1 : 1;
        const cursor = resolveIndex(
          toggled.cursor + event.delta,
          direction,
          toggled.rowKeys.length,
          deps.isSelectable,
        );
        return cursor === null ? toggled : { ...toggled, cursor };
      },
      toggleCurrent: (ctx) => toggle(ctx),
    },
  });
};

const toggle = function toggle(ctx: NavSearchContext): NavSearchContext {
  if (ctx.cursor === null) {
    return ctx;
  }
  const key = ctx.rowKeys[ctx.cursor];
  if (key === undefined) {
    return ctx;
  }
  const toggledKeys = new Set(ctx.toggledKeys);
  if (toggledKeys.has(key)) {
    toggledKeys.delete(key);
  } else {
    toggledKeys.add(key);
  }
  return { ...ctx, toggledKeys };
};

const searchStep = function searchStep(
  ctx: NavSearchContext,
  delta: 1 | -1,
  enqueue: { emit: { jumped: (event: { index: number }) => void } },
): NavSearchContext {
  if (ctx.search.matches.length === 0) {
    return ctx;
  }
  const currentMatchIndex =
    (ctx.search.currentMatchIndex + delta + ctx.search.matches.length) % ctx.search.matches.length;
  const cursor = ctx.search.matches[currentMatchIndex];
  enqueue.emit.jumped({ index: cursor });
  return { ...ctx, cursor, search: { ...ctx.search, currentMatchIndex } };
};

export type NavSearchStore = ReturnType<typeof createNavSearchStore>;

export const selectCursor = (ctx: NavSearchContext) => ctx.cursor;
export const selectRowKeys = (ctx: NavSearchContext) => ctx.rowKeys;
export const selectSelectionAnchor = (ctx: NavSearchContext) => ctx.selectionAnchor;
export const selectToggledKeys = (ctx: NavSearchContext) => ctx.toggledKeys;
export const selectSearchStatus = (ctx: NavSearchContext) => ctx.search.status;
export const selectSearchActive = (ctx: NavSearchContext) => ctx.search.status === "editing";
export const selectSearchQuery = (ctx: NavSearchContext) =>
  ctx.search.status === "editing" ? ctx.search.query : ctx.search.committedQuery;
export const selectMatches = (ctx: NavSearchContext) => ctx.search.matches;
export const selectCurrentMatchIndex = (ctx: NavSearchContext) => ctx.search.currentMatchIndex;
export const deriveSelection = function deriveSelection(ctx: NavSearchContext, mode: Mode) {
  return mode === "select" && ctx.selectionAnchor !== null && ctx.cursor !== null
    ? {
        end: Math.max(ctx.selectionAnchor, ctx.cursor),
        start: Math.min(ctx.selectionAnchor, ctx.cursor),
      }
    : null;
};
