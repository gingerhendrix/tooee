import { createStore } from "@xstate/store"
import type { Mode } from "@tooee/commands"

export type RowKey = string | number | bigint
export type SearchStatus = "idle" | "editing" | "committed"

export interface NavSearchContext {
  rowKeys: readonly RowKey[]
  cursor: number | null
  selectionAnchor: number | null
  toggledKeys: ReadonlySet<RowKey>
  search: {
    status: SearchStatus
    query: string
    committedQuery: string
    matches: readonly number[]
    currentMatchIndex: number
    preSearchMode: Mode
  }
}

export interface NavSearchDeps {
  isSelectable(index: number): boolean
}

export type NavSearchEvents = {
  rowsChanged: { keys: readonly RowKey[]; preserveCursorByKey?: boolean }
  move: { delta: number }
  jump: { index: number; direction: 1 | -1 }
  setCursor: { index: number }
  enterSelect: {}
  cancelSelect: {}
  toggleCurrent: {}
  toggleAndMove: { delta: number }
  searchStarted: { mode: Mode }
  searchChanged: { query: string; matches: readonly number[] }
  searchSubmitted: {}
  searchCancelled: {}
  searchNext: {}
  searchPrevious: {}
}

type NavSearchEmitted = {
  restoreMode: { mode: Mode }
  jumped: { index: number }
}

export function resolveIndex(
  target: number,
  direction: 1 | -1,
  rowCount: number,
  isSelectable: (index: number) => boolean,
): number | null {
  if (rowCount <= 0) return null
  const max = rowCount - 1
  const clamped = Math.max(0, Math.min(target, max))
  if (isSelectable(clamped)) return clamped
  for (
    let index = clamped + direction;
    direction === 1 ? index <= max : index >= 0;
    index += direction
  ) {
    if (isSelectable(index)) return index
  }
  for (
    let index = clamped - direction;
    direction === 1 ? index >= 0 : index <= max;
    index -= direction
  ) {
    if (isSelectable(index)) return index
  }
  return null
}

const EMPTY_KEYS: readonly RowKey[] = []

export function createNavSearchStore(
  options: {
    keys?: readonly RowKey[]
    deps?: NavSearchDeps
  } = {},
) {
  const deps = options.deps ?? { isSelectable: () => true }
  const keys = options.keys ?? EMPTY_KEYS
  const resolve = (index: number, direction: 1 | -1, count = keys.length) =>
    resolveIndex(index, direction, count, deps.isSelectable)

  return createStore<NavSearchContext, NavSearchEvents, NavSearchEmitted>({
    context: {
      rowKeys: keys,
      cursor: resolve(0, 1),
      selectionAnchor: null,
      toggledKeys: new Set(),
      search: {
        status: "idle",
        query: "",
        committedQuery: "",
        matches: [],
        currentMatchIndex: 0,
        preSearchMode: "cursor",
      },
    },
    on: {
      rowsChanged: (ctx, event) => {
        const previousKey = ctx.cursor === null ? undefined : ctx.rowKeys[ctx.cursor]
        let cursor = ctx.cursor
        if (event.keys.length === 0) cursor = null
        else if (event.preserveCursorByKey && previousKey !== undefined) {
          const preserved = event.keys.indexOf(previousKey)
          cursor =
            preserved >= 0
              ? resolveIndex(preserved, 1, event.keys.length, deps.isSelectable)
              : resolveIndex(
                  Math.min(ctx.cursor!, event.keys.length - 1),
                  1,
                  event.keys.length,
                  deps.isSelectable,
                )
        } else if (cursor === null || cursor >= event.keys.length) {
          cursor = resolveIndex(
            cursor === null ? 0 : event.keys.length - 1,
            cursor === null ? 1 : -1,
            event.keys.length,
            deps.isSelectable,
          )
        } else if (!deps.isSelectable(cursor)) {
          cursor = resolveIndex(cursor, 1, event.keys.length, deps.isSelectable)
        }
        const available = new Set(event.keys)
        const filtered = new Set([...ctx.toggledKeys].filter((key) => available.has(key)))
        const toggledKeys = filtered.size === ctx.toggledKeys.size ? ctx.toggledKeys : filtered
        return { ...ctx, rowKeys: event.keys, cursor, toggledKeys }
      },
      move: (ctx, event) => {
        if (ctx.cursor === null) return ctx
        const direction: 1 | -1 = event.delta < 0 ? -1 : 1
        const cursor = resolveIndex(
          ctx.cursor + event.delta,
          direction,
          ctx.rowKeys.length,
          deps.isSelectable,
        )
        return cursor === null || cursor === ctx.cursor ? ctx : { ...ctx, cursor }
      },
      jump: (ctx, event) => ({
        ...ctx,
        cursor: resolveIndex(event.index, event.direction, ctx.rowKeys.length, deps.isSelectable),
      }),
      setCursor: (ctx, event) => {
        const direction: 1 | -1 = ctx.cursor !== null && event.index < ctx.cursor ? -1 : 1
        const cursor = resolveIndex(event.index, direction, ctx.rowKeys.length, deps.isSelectable)
        return cursor === null ? ctx : { ...ctx, cursor }
      },
      enterSelect: (ctx) => ({ ...ctx, selectionAnchor: ctx.cursor }),
      cancelSelect: (ctx) =>
        ctx.selectionAnchor === null ? ctx : { ...ctx, selectionAnchor: null },
      toggleCurrent: (ctx) => toggle(ctx),
      toggleAndMove: (ctx, event) => {
        const toggled = toggle(ctx)
        if (toggled.cursor === null) return toggled
        const direction: 1 | -1 = event.delta < 0 ? -1 : 1
        const cursor = resolveIndex(
          toggled.cursor + event.delta,
          direction,
          toggled.rowKeys.length,
          deps.isSelectable,
        )
        return cursor === null ? toggled : { ...toggled, cursor }
      },
      searchStarted: (ctx, event) => ({
        ...ctx,
        search: {
          ...ctx.search,
          status: "editing",
          query: "",
          matches: [],
          currentMatchIndex: 0,
          preSearchMode: event.mode,
        },
      }),
      searchChanged: (ctx, event, enqueue) => {
        const first = event.matches[0]
        if (first !== undefined) enqueue.emit.jumped({ index: first })
        return {
          ...ctx,
          cursor:
            first === undefined
              ? ctx.cursor
              : resolveIndex(first, 1, ctx.rowKeys.length, deps.isSelectable),
          search: {
            ...ctx.search,
            query: event.query,
            matches: event.matches,
            currentMatchIndex: 0,
          },
        }
      },
      searchSubmitted: (ctx, _event, enqueue) => {
        const first = ctx.search.matches[0]
        if (first !== undefined) enqueue.emit.jumped({ index: first })
        enqueue.emit.restoreMode({ mode: ctx.search.preSearchMode })
        return {
          ...ctx,
          cursor:
            first === undefined
              ? ctx.cursor
              : resolveIndex(first, 1, ctx.rowKeys.length, deps.isSelectable),
          search: {
            ...ctx.search,
            status: "committed",
            committedQuery: ctx.search.query,
            currentMatchIndex: 0,
          },
        }
      },
      searchCancelled: (ctx, _event, enqueue) => {
        enqueue.emit.restoreMode({ mode: ctx.search.preSearchMode })
        return {
          ...ctx,
          search: {
            ...ctx.search,
            status: "idle",
            query: "",
            committedQuery: "",
            matches: [],
            currentMatchIndex: 0,
          },
        }
      },
      searchNext: (ctx, _event, enqueue) => searchStep(ctx, 1, enqueue),
      searchPrevious: (ctx, _event, enqueue) => searchStep(ctx, -1, enqueue),
    },
  })
}

function toggle(ctx: NavSearchContext): NavSearchContext {
  if (ctx.cursor === null) return ctx
  const key = ctx.rowKeys[ctx.cursor]
  if (key === undefined) return ctx
  const toggledKeys = new Set(ctx.toggledKeys)
  if (toggledKeys.has(key)) toggledKeys.delete(key)
  else toggledKeys.add(key)
  return { ...ctx, toggledKeys }
}

function searchStep(
  ctx: NavSearchContext,
  delta: 1 | -1,
  enqueue: { emit: { jumped: (event: { index: number }) => void } },
): NavSearchContext {
  if (ctx.search.matches.length === 0) return ctx
  const currentMatchIndex =
    (ctx.search.currentMatchIndex + delta + ctx.search.matches.length) % ctx.search.matches.length
  const cursor = ctx.search.matches[currentMatchIndex]!
  enqueue.emit.jumped({ index: cursor })
  return { ...ctx, cursor, search: { ...ctx.search, currentMatchIndex } }
}

export type NavSearchStore = ReturnType<typeof createNavSearchStore>

export const selectCursor = (ctx: NavSearchContext) => ctx.cursor
export const selectRowKeys = (ctx: NavSearchContext) => ctx.rowKeys
export const selectSelectionAnchor = (ctx: NavSearchContext) => ctx.selectionAnchor
export const selectToggledKeys = (ctx: NavSearchContext) => ctx.toggledKeys
export const selectSearchStatus = (ctx: NavSearchContext) => ctx.search.status
export const selectSearchActive = (ctx: NavSearchContext) => ctx.search.status === "editing"
export const selectSearchQuery = (ctx: NavSearchContext) =>
  ctx.search.status === "editing" ? ctx.search.query : ctx.search.committedQuery
export const selectMatches = (ctx: NavSearchContext) => ctx.search.matches
export const selectCurrentMatchIndex = (ctx: NavSearchContext) => ctx.search.currentMatchIndex
export function deriveSelection(ctx: NavSearchContext, mode: Mode) {
  return mode === "select" && ctx.selectionAnchor !== null && ctx.cursor !== null
    ? {
        start: Math.min(ctx.selectionAnchor, ctx.cursor),
        end: Math.max(ctx.selectionAnchor, ctx.cursor),
      }
    : null
}
