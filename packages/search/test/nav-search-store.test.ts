import { describe, expect, test } from "bun:test";
import {
  createNavSearchStore,
  deriveSelection,
  selectMatches,
  selectSearchQuery,
  selectSearchStatus,
} from "../src/nav-search-store.js";

const context = (store: ReturnType<typeof createNavSearchStore>) => store.getSnapshot().context;

describe("rows and cursor invariants", () => {
  test("initializes, shrinks and clears synchronously", () => {
    const store = createNavSearchStore();
    expect(context(store).cursor).toBeNull();
    store.trigger.rowsChanged({ keys: ["a", "b", "c"] });
    store.trigger.setCursor({ index: 2 });
    store.trigger.rowsChanged({ keys: ["a"] });
    expect(context(store).cursor).toBe(0);
    store.trigger.rowsChanged({ keys: [] });
    expect(context(store).cursor).toBeNull();
  });

  test("preserves stable cursor and toggle keys across reorder", () => {
    const store = createNavSearchStore({ keys: ["a", "b", "c"] });
    store.trigger.setCursor({ index: 1 });
    store.trigger.toggleCurrent({});
    store.trigger.rowsChanged({ keys: ["c", "a", "b"], preserveCursorByKey: true });
    expect(context(store).cursor).toBe(2);
    expect(context(store).toggledKeys).toEqual(new Set(["b"]));
  });

  test("drops toggles whose keys disappear", () => {
    const store = createNavSearchStore({ keys: ["a", "b"] });
    store.trigger.toggleCurrent({});
    store.trigger.rowsChanged({ keys: ["b"] });
    expect(context(store).toggledKeys.size).toBe(0);
  });

  test("skips non-selectable gaps in both directions", () => {
    const deps = { isSelectable: (index: number) => index === 0 || index === 3 };
    const store = createNavSearchStore({ deps, keys: [0, 1, 2, 3] });
    store.trigger.move({ delta: 1 });
    expect(context(store).cursor).toBe(3);
    store.trigger.move({ delta: -1 });
    expect(context(store).cursor).toBe(0);
  });
});

describe("selection and toggles", () => {
  test("derives ordered multi-row selection", () => {
    const store = createNavSearchStore({ keys: [0, 1, 2] });
    store.trigger.setCursor({ index: 2 });
    store.trigger.enterSelect({});
    store.trigger.move({ delta: -2 });
    expect(deriveSelection(context(store), "select")).toEqual({ end: 2, start: 0 });
    store.trigger.cancelSelect({});
    expect(deriveSelection(context(store), "select")).toBeNull();
  });

  test("toggle-and-move is atomic", () => {
    const store = createNavSearchStore({ keys: ["a", "b"] });
    store.trigger.setCursor({ index: 1 });
    store.trigger.toggleAndMove({ delta: -1 });
    expect(context(store).toggledKeys).toEqual(new Set(["b"]));
    expect(context(store).cursor).toBe(0);
  });
});

describe("search", () => {
  test("stores one supplied match result and cycles next/previous", () => {
    const matches = [1, 3];
    const store = createNavSearchStore({ keys: [0, 1, 2, 3] });
    store.trigger.searchStarted({ mode: "select" });
    store.trigger.searchChanged({ matches, query: "x" });
    expect(selectMatches(context(store))).toBe(matches);
    expect(context(store).cursor).toBe(1);
    store.trigger.searchNext({});
    expect(context(store).cursor).toBe(3);
    store.trigger.searchPrevious({});
    expect(context(store).cursor).toBe(1);
  });

  test("submit commits without re-matching and restores the prior mode", () => {
    const store = createNavSearchStore({ keys: [0, 1] });
    const restored: string[] = [];
    store.on("restoreMode", ({ mode }) => restored.push(mode));
    store.trigger.searchStarted({ mode: "select" });
    store.trigger.searchChanged({ matches: [1], query: "one" });
    store.trigger.searchSubmitted({});
    expect(selectSearchStatus(context(store))).toBe("committed");
    expect(selectSearchQuery(context(store))).toBe("one");
    expect(restored).toEqual(["select"]);
  });

  test("cancel clears search and restores the prior mode", () => {
    const store = createNavSearchStore({ keys: [0] });
    const restored: string[] = [];
    store.on("restoreMode", ({ mode }) => restored.push(mode));
    store.trigger.searchStarted({ mode: "cursor" });
    store.trigger.searchChanged({ matches: [0], query: "x" });
    store.trigger.searchCancelled({});
    expect(selectSearchStatus(context(store))).toBe("idle");
    expect(selectMatches(context(store))).toEqual([]);
    expect(restored).toEqual(["cursor"]);
  });
});
