import { createStore } from "@xstate/store";
import { fuzzyFilter } from "./fuzzy.js";
import type { FuzzyMatch } from "./fuzzy.js";
import type { ChooseItem } from "./types.js";

export interface ChooseStoreContext {
  items: ChooseItem[];
  matches: FuzzyMatch[];
  filterQuery: string;
  activeIndex: number;
  selectedOriginalIndices: ReadonlySet<number>;
  loading: boolean;
  error: string | null;
  requestId: number;
  reloadRevision: number;
}

interface ChooseStoreEventDefinitions {
  filterChanged: { query: string };
  activeIndexSet: { index: number };
  moved: { delta: number };
  activeToggled: Record<never, never>;
  requestStarted: Record<never, never>;
  loadingStarted: { requestId: number };
  loadSucceeded: { requestId: number; items: ChooseItem[] };
  loadFailed: { requestId: number; error: string };
  reloadRequested: Record<never, never>;
}

export type ChooseStoreEvents = {
  [EventName in keyof ChooseStoreEventDefinitions]: ChooseStoreEventDefinitions[EventName];
};

const replaceItems = function replaceItems(
  ctx: ChooseStoreContext,
  items: ChooseItem[],
): ChooseStoreContext {
  return {
    ...ctx,
    activeIndex: 0,
    items,
    matches: fuzzyFilter(items, ctx.filterQuery),
    selectedOriginalIndices: new Set(),
  };
};

const clampActiveIndex = function clampActiveIndex(index: number, matchCount: number): number {
  return Math.min(Math.max(0, matchCount - 1), Math.max(0, index));
};

export const createChooseStore = function createChooseStore(options: {
  items?: ChooseItem[];
  initialFilter?: string;
  loading?: boolean;
}) {
  const items = options.items ?? [];
  const filterQuery = options.initialFilter ?? "";

  return createStore<ChooseStoreContext, ChooseStoreEvents>({
    context: {
      activeIndex: 0,
      error: null,
      filterQuery,
      items,
      loading: options.loading ?? false,
      matches: fuzzyFilter(items, filterQuery),
      reloadRevision: 0,
      requestId: 0,
      selectedOriginalIndices: new Set(),
    },
    on: {
      activeIndexSet: (ctx, event) => {
        const activeIndex = clampActiveIndex(event.index, ctx.matches.length);
        return activeIndex === ctx.activeIndex ? ctx : { ...ctx, activeIndex };
      },
      activeToggled: (ctx) => {
        const originalIndex = ctx.matches[ctx.activeIndex]?.originalIndex;
        if (originalIndex === undefined) {
          return ctx;
        }
        const selectedOriginalIndices = new Set(ctx.selectedOriginalIndices);
        if (selectedOriginalIndices.has(originalIndex)) {
          selectedOriginalIndices.delete(originalIndex);
        } else {
          selectedOriginalIndices.add(originalIndex);
        }
        return { ...ctx, selectedOriginalIndices };
      },
      filterChanged: (ctx, event) => {
        if (event.query === ctx.filterQuery) {
          return ctx;
        }
        return {
          ...ctx,
          activeIndex: 0,
          filterQuery: event.query,
          matches: fuzzyFilter(ctx.items, event.query),
        };
      },
      loadFailed: (ctx, event) => {
        if (event.requestId !== ctx.requestId) {
          return ctx;
        }
        return {
          ...replaceItems(ctx, []),
          error: event.error,
          loading: false,
        };
      },
      loadSucceeded: (ctx, event) => {
        if (event.requestId !== ctx.requestId) {
          return ctx;
        }
        return {
          ...replaceItems(ctx, event.items),
          error: null,
          loading: false,
        };
      },
      loadingStarted: (ctx, event) =>
        event.requestId === ctx.requestId && !ctx.loading ? { ...ctx, loading: true } : ctx,
      moved: (ctx, event) => {
        const activeIndex = clampActiveIndex(ctx.activeIndex + event.delta, ctx.matches.length);
        return activeIndex === ctx.activeIndex ? ctx : { ...ctx, activeIndex };
      },
      reloadRequested: (ctx) => ({ ...ctx, reloadRevision: ctx.reloadRevision + 1 }),
      requestStarted: (ctx) => ({
        ...ctx,
        error: null,
        requestId: ctx.requestId + 1,
      }),
    },
  });
};

export type ChooseStore = ReturnType<typeof createChooseStore>;

export const selectItems = (ctx: ChooseStoreContext): ChooseItem[] => ctx.items;
export const selectMatches = (ctx: ChooseStoreContext): FuzzyMatch[] => ctx.matches;
export const selectFilterQuery = (ctx: ChooseStoreContext): string => ctx.filterQuery;
export const selectActiveIndex = (ctx: ChooseStoreContext): number => ctx.activeIndex;
export const selectSelectedOriginalIndices = (ctx: ChooseStoreContext): ReadonlySet<number> =>
  ctx.selectedOriginalIndices;
export const selectLoading = (ctx: ChooseStoreContext): boolean => ctx.loading;
export const selectError = (ctx: ChooseStoreContext): string | null => ctx.error;
export const selectReloadRevision = (ctx: ChooseStoreContext): number => ctx.reloadRevision;
