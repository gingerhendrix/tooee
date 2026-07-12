import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "@xstate/store-react";
import { useCommand, useMode, useSetMode } from "@tooee/commands";
import type { Mode } from "@tooee/commands";
import {
  createNavSearchStore,
  selectCurrentMatchIndex,
  selectMatches,
  selectSearchActive,
  selectSearchQuery,
} from "./nav-search-store.js";
import type { NavSearchDeps, NavSearchStore, RowKey } from "./nav-search-store.js";

export interface UseSearchOptions {
  match: (query: string) => number[];
  onJump: (index: number) => void;
  enabled?: boolean;
  deps?: readonly unknown[];
}

export interface SearchState {
  searchQuery: string;
  searchActive: boolean;
  setSearchQuery: (query: string) => void;
  matchingLines: number[];
  currentMatchIndex: number;
  submitSearch: () => void;
}

const CURSOR_MODES: Mode[] = ["cursor"];
const ALL_MODES: Mode[] = ["cursor", "select", "insert"];

export function useNavSearchStore(options: {
  keys: readonly RowKey[];
  isSelectable?: (index: number) => boolean;
  preserveCursorByKey?: boolean;
}): NavSearchStore {
  const depsRef = useRef<NavSearchDeps>({ isSelectable: options.isSelectable ?? (() => true) });
  depsRef.current.isSelectable = options.isSelectable ?? (() => true);
  const [store] = useState(() =>
    createNavSearchStore({ deps: depsRef.current, keys: options.keys }),
  );
  useEffect(() => {
    const currentKeys = store.getSnapshot().context.rowKeys;
    const keysChanged =
      currentKeys.length !== options.keys.length ||
      currentKeys.some((key, index) => !Object.is(key, options.keys[index]));
    if (keysChanged) {
      store.trigger.rowsChanged({
        keys: options.keys,
        preserveCursorByKey: options.preserveCursorByKey,
      });
    }
  }, [store, options.keys, options.preserveCursorByKey]);
  return store;
}

export function useSearchBindings(
  store: NavSearchStore,
  {
    match,
    onJump,
    enabled = true,
    deps = [],
  }: Omit<UseSearchOptions, "onJump"> & { onJump?: (index: number) => void },
): SearchState {
  const mode = useMode();
  const setMode = useSetMode();
  const matchRef = useRef(match);
  matchRef.current = match;
  const onJumpRef = useRef(onJump);
  onJumpRef.current = onJump;

  useEffect(() => {
    const subscription = store.on("jumped", ({ index }) => onJumpRef.current?.(index));
    return () => subscription.unsubscribe();
  }, [store]);
  useEffect(() => {
    const subscription = store.on("restoreMode", ({ mode: restored }) => setMode(restored));
    return () => subscription.unsubscribe();
  }, [store, setMode]);

  const searchQuery = useSelector(store, (snapshot) => selectSearchQuery(snapshot.context));
  const searchActive = useSelector(store, (snapshot) => selectSearchActive(snapshot.context));
  const matchingLines = useSelector(store, (snapshot) =>
    selectMatches(snapshot.context),
  ) as number[];
  const currentMatchIndex = useSelector(store, (snapshot) =>
    selectCurrentMatchIndex(snapshot.context),
  );

  const updateSearchQuery = useCallback(
    (query: string) => {
      store.trigger.searchChanged({ matches: query ? matchRef.current(query) : [], query });
    },
    [store],
  );

  // Re-match a committed query once when the caller-declared content changes.
  const depsRef = useRef(deps);
  useEffect(() => {
    if (
      depsRef.current.every((value, index) => Object.is(value, deps[index])) &&
      depsRef.current.length === deps.length
    ) {
      return;
    }
    depsRef.current = deps;
    const query = selectSearchQuery(store.getSnapshot().context);
    if (query) {
      store.trigger.searchChanged({ matches: matchRef.current(query), query });
    }
  }, [deps, store]);

  useCommand({
    enabled,
    handler: () => {
      store.trigger.searchStarted({ mode });
      setMode("insert");
    },
    hotkey: "/",
    id: "cursor-search-start",
    modes: CURSOR_MODES,
    title: "Search",
  });
  useCommand({
    enabled,
    handler: () => store.trigger.searchNext({}),
    hotkey: "n",
    id: "cursor-search-next",
    modes: CURSOR_MODES,
    title: "Next match",
    when: () => !selectSearchActive(store.getSnapshot().context),
  });
  useCommand({
    enabled,
    handler: () => store.trigger.searchPrevious({}),
    hotkey: "shift+n",
    id: "cursor-search-prev",
    modes: CURSOR_MODES,
    title: "Previous match",
    when: () => !selectSearchActive(store.getSnapshot().context),
  });
  useCommand({
    enabled,
    handler: () => store.trigger.searchCancelled({}),
    hotkey: "escape",
    id: "search-cancel",
    modes: ALL_MODES,
    title: "Cancel search",
    when: () => selectSearchActive(store.getSnapshot().context),
  });

  return {
    currentMatchIndex,
    matchingLines,
    searchActive,
    searchQuery,
    setSearchQuery: updateSearchQuery,
    submitSearch: () => store.trigger.searchSubmitted({}),
  };
}

export function useSearch(options: UseSearchOptions): SearchState {
  const store = useNavSearchStore({ keys: [] });
  return useSearchBindings(store, options);
}
