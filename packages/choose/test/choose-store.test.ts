import { describe, expect, test } from "bun:test";
import {
  createChooseStore,
  selectActiveIndex,
  selectFilterQuery,
  selectMatches,
  selectSelectedOriginalIndices,
} from "../src/choose-store.js";
import type { ChooseItem } from "../src/types.js";

const ITEMS: ChooseItem[] = [
  { text: "Alpha", value: "alpha" },
  { text: "Beta", value: "beta" },
  { text: "Gamma", value: "gamma" },
];

const context = (store: ReturnType<typeof createChooseStore>) => store.getSnapshot().context;

describe("filtering and navigation", () => {
  test("filters and resets the active match atomically", () => {
    const store = createChooseStore({ items: ITEMS });
    store.trigger.activeIndexSet({ index: 2 });
    store.trigger.filterChanged({ query: "be" });

    expect(selectFilterQuery(context(store))).toBe("be");
    expect(selectMatches(context(store)).map((match) => match.item.value)).toEqual(["beta"]);
    expect(selectActiveIndex(context(store))).toBe(0);
  });

  test("clamps navigation to the available matches", () => {
    const store = createChooseStore({ items: ITEMS });
    store.trigger.moved({ delta: 20 });
    expect(selectActiveIndex(context(store))).toBe(2);
    store.trigger.moved({ delta: -20 });
    expect(selectActiveIndex(context(store))).toBe(0);
  });
});

describe("selection", () => {
  test("tracks original indices across a filtered result", () => {
    const store = createChooseStore({ items: ITEMS });
    store.trigger.filterChanged({ query: "ga" });
    store.trigger.activeToggled({});
    expect(selectSelectedOriginalIndices(context(store))).toEqual(new Set([2]));
    store.trigger.activeToggled({});
    expect(selectSelectedOriginalIndices(context(store))).toEqual(new Set());
  });

  test("clears selection when items are replaced", () => {
    const store = createChooseStore({ items: ITEMS });
    store.trigger.activeToggled({});
    store.trigger.requestStarted({});
    const { requestId } = context(store);
    store.trigger.loadSucceeded({
      items: [{ text: "Delta", value: "delta" }],
      requestId,
    });
    expect(selectSelectedOriginalIndices(context(store))).toEqual(new Set());
    expect(selectMatches(context(store)).map((match) => match.item.value)).toEqual(["delta"]);
  });
});

describe("source requests", () => {
  test("ignores stale async results", () => {
    const store = createChooseStore({ loading: true });
    store.trigger.requestStarted({});
    const firstRequestId = context(store).requestId;
    store.trigger.requestStarted({});
    const secondRequestId = context(store).requestId;
    store.trigger.loadSucceeded({ items: ITEMS, requestId: firstRequestId });
    expect(context(store).items).toEqual([]);
    store.trigger.loadSucceeded({ items: ITEMS, requestId: secondRequestId });
    expect(context(store).items).toBe(ITEMS);
    expect(context(store).loading).toBe(false);
  });

  test("records the current error and clears items", () => {
    const store = createChooseStore({ items: ITEMS });
    store.trigger.requestStarted({});
    store.trigger.loadFailed({ error: "broken source", requestId: context(store).requestId });
    expect(context(store).error).toBe("broken source");
    expect(context(store).items).toEqual([]);
    expect(context(store).loading).toBe(false);
  });

  test("increments the reload revision", () => {
    const store = createChooseStore({ items: ITEMS });
    store.trigger.reloadRequested({});
    expect(context(store).reloadRevision).toBe(1);
  });
});
