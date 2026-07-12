import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "@xstate/store-react";
import { useCommand, useMode, useSetMode, type Mode } from "@tooee/commands";
import {
  createNavSearchStore,
  selectCurrentMatchIndex,
  selectMatches,
  selectSearchActive,
  selectSearchQuery,
  type NavSearchDeps,
  type NavSearchStore,
  type RowKey,
} from "./nav-search-store.js";

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
    createNavSearchStore({ keys: options.keys, deps: depsRef.current }),
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
      store.trigger.searchChanged({ query, matches: query ? matchRef.current(query) : [] });
    },
    [store],
  );

  // Re-match a committed query once when the caller-declared content changes.
  const depsRef = useRef(deps);
  useEffect(() => {
    if (
      depsRef.current.every((value, index) => Object.is(value, deps[index])) &&
      depsRef.current.length === deps.length
    )
      return;
    depsRef.current = deps;
    const query = selectSearchQuery(store.getSnapshot().context);
    if (query) store.trigger.searchChanged({ query, matches: matchRef.current(query) });
  }, [deps, store]);

  useCommand({
    id: "cursor-search-start",
    title: "Search",
    hotkey: "/",
    modes: CURSOR_MODES,
    enabled,
    handler: () => {
      store.trigger.searchStarted({ mode });
      setMode("insert");
    },
  });
  useCommand({
    id: "cursor-search-next",
    title: "Next match",
    hotkey: "n",
    modes: CURSOR_MODES,
    enabled,
    when: () => !selectSearchActive(store.getSnapshot().context),
    handler: () => store.trigger.searchNext({}),
  });
  useCommand({
    id: "cursor-search-prev",
    title: "Previous match",
    hotkey: "shift+n",
    modes: CURSOR_MODES,
    enabled,
    when: () => !selectSearchActive(store.getSnapshot().context),
    handler: () => store.trigger.searchPrevious({}),
  });
  useCommand({
    id: "search-cancel",
    title: "Cancel search",
    hotkey: "escape",
    modes: ALL_MODES,
    enabled,
    when: () => selectSearchActive(store.getSnapshot().context),
    handler: () => store.trigger.searchCancelled({}),
  });

  return {
    searchQuery,
    searchActive,
    setSearchQuery: updateSearchQuery,
    matchingLines,
    currentMatchIndex,
    submitSearch: () => store.trigger.searchSubmitted({}),
  };
}

export function useSearch(options: UseSearchOptions): SearchState {
  const store = useNavSearchStore({ keys: [] });
  return useSearchBindings(store, options);
}
