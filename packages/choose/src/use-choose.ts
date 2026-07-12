import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InputRenderable, KeyEvent } from "@opentui/core";
import {
  useActiveCommandSurface,
  useActions,
  useCommand,
  useCommandSurfaceId,
  useMode,
  useProvideCommandContext,
  useSetMode,
  type ActionDefinition,
  type Mode,
} from "@tooee/commands";
import { fuzzyFilter, type FuzzyMatch } from "./fuzzy.js";
import { chooseSourceError, loadChooseSource } from "./source.js";
import type { ChooseItem, ChooseResult, ChooseSource } from "./types.js";

declare module "@tooee/commands" {
  interface CommandContext {
    /** Contributed by chooser primitives: current filtering and selection state. */
    choose: {
      activeItem: ChooseItem | undefined;
      selectedItems: ChooseItem[];
      filterQuery: string;
    };
  }
}

export type ChooseCommandGroup = "navigation" | "mode" | "submit" | "cancel" | "multi-select";

export interface UseChooseOptions {
  source: ChooseSource;
  multi?: boolean;
  initialFilter?: string;
  onSubmit: (result: ChooseResult) => void | Promise<void>;
  onCancel?: () => void;
  commands?: ActionDefinition[];
  /** Prefix for built-in command ids (default `choose`). */
  commandScope?: string;
  /** Disable a built-in command group when a host owns those keys. */
  disable?: ChooseCommandGroup[];
  /** Explicitly blur/disable mouse views while a legacy covering surface is open. */
  suspended?: boolean;
}

export interface ChooseController {
  getFilter(): string;
  setFilter(query: string): void;
  clearFilter(): void;
  moveUp(): void;
  moveDown(): void;
  setActiveIndex(index: number): void;
  getActiveItem(): ChooseItem | undefined;
  getSelectedItems(): ChooseItem[];
  toggleActive(): void;
  submit(): void;
  cancel(): void;
  reload(): void;
  readonly mode: Mode;
  setMode(mode: Mode): void;
}

export interface ChooseState {
  items: ChooseItem[];
  matches: FuzzyMatch[];
  filterQuery: string;
  activeIndex: number;
  activeItem: ChooseItem | undefined;
  selectedOriginalIndices: ReadonlySet<number>;
  selectedItems: ChooseItem[];
  loading: boolean;
  error: string | null;
  multi: boolean;
}

export interface ChooseViewModel {
  filterRef: { current: InputRenderable | null };
  mode: Mode;
  /** True while another modal surface (or an explicit host guard) owns interaction. */
  suspended: boolean;
  filterFocused: boolean;
  onFilterInput: (query: string) => void;
  /** Input-level Tab bridge; OpenTUI consumes Tab before global dispatch. */
  onFilterKeyDown: (event: KeyEvent) => void;
}

export interface UseChooseResult {
  controller: ChooseController;
  state: ChooseState;
  view: ChooseViewModel;
}

/**
 * Shared headless chooser: source lifecycle, fuzzy matches, selection,
 * command context, controller, and all built-in keyboard commands.
 */
export function useChoose(options: UseChooseOptions): UseChooseResult {
  const { source, multi = false, initialFilter = "", commandScope = "choose" } = options;
  const initialItems = Array.isArray(source) ? source : [];

  const [items, setItems] = useState<ChooseItem[]>(initialItems);
  const [filterQuery, setFilterQuery] = useState(initialFilter);
  const [activeIndex, setActiveIndexState] = useState(0);
  const [selectedOriginalIndices, setSelectedOriginalIndices] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(!Array.isArray(source));
  const [error, setError] = useState<string | null>(null);
  const [reloadRevision, setReloadRevision] = useState(0);
  const filterRef = useRef<InputRenderable>(null);
  const requestIdRef = useRef(0);
  const initialArraySourceRef = useRef<ChooseItem[] | null>(Array.isArray(source) ? source : null);
  const didHandleInitialSourceRef = useRef(false);

  const matches = useMemo(() => fuzzyFilter(items, filterQuery), [items, filterQuery]);
  const activeItem = matches[activeIndex]?.item;
  const selectedItems = useMemo(() => {
    if (!multi) return activeItem ? [activeItem] : [];
    const selected = Array.from(selectedOriginalIndices).flatMap((index) => {
      const item = items[index];
      return item ? [item] : [];
    });
    return selected.length > 0 ? selected : activeItem ? [activeItem] : [];
  }, [multi, activeItem, selectedOriginalIndices, items]);

  const mode = useMode();
  const setMode = useSetMode();

  // Stable controller methods read live values through refs, including when
  // multiple imperative operations happen before React renders again.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const matchesRef = useRef(matches);
  matchesRef.current = matches;
  const filterQueryRef = useRef(filterQuery);
  filterQueryRef.current = filterQuery;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const selectedRef = useRef(selectedOriginalIndices);
  selectedRef.current = selectedOriginalIndices;
  const multiRef = useRef(multi);
  multiRef.current = multi;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const replaceItems = useCallback((nextItems: ChooseItem[]) => {
    itemsRef.current = nextItems;
    matchesRef.current = fuzzyFilter(nextItems, filterQueryRef.current);
    activeIndexRef.current = 0;
    selectedRef.current = new Set();
    setItems(nextItems);
    setActiveIndexState(0);
    setSelectedOriginalIndices(selectedRef.current);
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let active = true;
    let result: ChooseItem[] | Promise<ChooseItem[]>;

    // Direct arrays seed state during the first render. Avoid a redundant
    // post-mount reset that could overwrite immediate controller operations.
    if (
      !didHandleInitialSourceRef.current &&
      Array.isArray(source) &&
      source === initialArraySourceRef.current
    ) {
      didHandleInitialSourceRef.current = true;
      setLoading(false);
      return;
    }
    didHandleInitialSourceRef.current = true;

    setError(null);
    try {
      result = loadChooseSource(source);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) return;
      replaceItems([]);
      setError(chooseSourceError(loadError));
      setLoading(false);
      return;
    }

    if (result instanceof Promise) {
      setLoading(true);
      void result.then(
        (loaded) => {
          if (!active || requestId !== requestIdRef.current) return;
          replaceItems(loaded);
          setError(null);
          setLoading(false);
        },
        (loadError: unknown) => {
          if (!active || requestId !== requestIdRef.current) return;
          replaceItems([]);
          setError(chooseSourceError(loadError));
          setLoading(false);
        },
      );
      return () => {
        active = false;
      };
    }

    replaceItems(result);
    setLoading(false);
  }, [source, reloadRevision, replaceItems]);

  const setFilter = useCallback((query: string) => {
    // Controlled OpenTUI inputs may echo a programmatic `value` update through
    // onInput. Only a real query change resets navigation.
    if (query === filterQueryRef.current) {
      setFilterQuery(query);
      return;
    }
    filterQueryRef.current = query;
    matchesRef.current = fuzzyFilter(itemsRef.current, query);
    activeIndexRef.current = 0;
    setFilterQuery(query);
    setActiveIndexState(0);
  }, []);

  const setActiveIndex = useCallback((index: number) => {
    const lastIndex = Math.max(0, matchesRef.current.length - 1);
    const next = Math.min(lastIndex, Math.max(0, index));
    activeIndexRef.current = next;
    setActiveIndexState(next);
  }, []);

  const moveUp = useCallback(() => setActiveIndex(activeIndexRef.current - 1), [setActiveIndex]);
  const moveDown = useCallback(() => setActiveIndex(activeIndexRef.current + 1), [setActiveIndex]);

  const getActiveItem = useCallback(() => matchesRef.current[activeIndexRef.current]?.item, []);

  const getSelectedItems = useCallback((): ChooseItem[] => {
    const active = getActiveItem();
    if (!multiRef.current) return active ? [active] : [];
    const selected = Array.from(selectedRef.current).flatMap((index) => {
      const item = itemsRef.current[index];
      return item ? [item] : [];
    });
    return selected.length > 0 ? selected : active ? [active] : [];
  }, [getActiveItem]);

  const toggleActive = useCallback(() => {
    if (!multiRef.current) return;
    const originalIndex = matchesRef.current[activeIndexRef.current]?.originalIndex;
    if (originalIndex === undefined) return;
    const next = new Set(selectedRef.current);
    if (next.has(originalIndex)) next.delete(originalIndex);
    else next.add(originalIndex);
    selectedRef.current = next;
    setSelectedOriginalIndices(next);
  }, []);

  const submit = useCallback(() => {
    void optionsRef.current.onSubmit({ items: getSelectedItems() });
  }, [getSelectedItems]);

  const cancel = useCallback(() => optionsRef.current.onCancel?.(), []);
  const reload = useCallback(() => setReloadRevision((revision) => revision + 1), []);
  const setModeExternal = useCallback((nextMode: Mode) => setMode(nextMode), [setMode]);

  useProvideCommandContext(() => ({
    choose: {
      activeItem: getActiveItem(),
      selectedItems: getSelectedItems(),
      filterQuery: filterQueryRef.current,
    },
    ...(optionsRef.current.onCancel ? { exit: cancel } : {}),
  }));

  useActions(options.commands);

  const enabled = useCallback(
    (group: ChooseCommandGroup) => !(optionsRef.current.disable?.includes(group) ?? false),
    [],
  );

  useCommand({
    id: `${commandScope}:escape`,
    title: "Back / cancel",
    hotkey: "Escape",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () =>
      modeRef.current === "insert"
        ? enabled("mode")
        : enabled("cancel") && optionsRef.current.onCancel !== undefined,
    handler: () => {
      if (modeRef.current === "insert") setMode("cursor");
      else cancel();
    },
  });
  useCommand({
    id: `${commandScope}:cancel`,
    title: "Cancel",
    hotkey: "q",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("cancel") && optionsRef.current.onCancel !== undefined,
    handler: cancel,
  });
  useCommand({
    id: `${commandScope}:insert-mode-i`,
    title: "Insert mode",
    hotkey: "i",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("mode"),
    handler: () => setMode("insert"),
  });
  useCommand({
    id: `${commandScope}:insert-mode-a`,
    title: "Insert mode",
    hotkey: "a",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("mode"),
    handler: () => setMode("insert"),
  });
  useCommand({
    id: `${commandScope}:move-down-vim`,
    title: "Move down",
    hotkey: "j",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("navigation"),
    handler: moveDown,
  });
  useCommand({
    id: `${commandScope}:move-up-vim`,
    title: "Move up",
    hotkey: "k",
    modes: ["cursor"],
    hidden: true,
    when: () => enabled("navigation"),
    handler: moveUp,
  });
  useCommand({
    id: `${commandScope}:confirm`,
    title: "Confirm",
    hotkey: "Enter",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => enabled("submit"),
    handler: submit,
  });
  useCommand({
    id: `${commandScope}:move-up`,
    title: "Move up",
    hotkey: "up",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => enabled("navigation"),
    handler: moveUp,
  });
  useCommand({
    id: `${commandScope}:move-up-ctrl-p`,
    title: "Move up",
    hotkey: "ctrl+p",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => enabled("navigation"),
    handler: moveUp,
  });
  useCommand({
    id: `${commandScope}:move-down`,
    title: "Move down",
    hotkey: "down",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => enabled("navigation"),
    handler: moveDown,
  });
  useCommand({
    id: `${commandScope}:move-down-ctrl-n`,
    title: "Move down",
    hotkey: "ctrl+n",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => enabled("navigation"),
    handler: moveDown,
  });
  useCommand({
    id: `${commandScope}:toggle-next`,
    title: "Toggle selection and move down",
    hotkey: "Tab",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => enabled("multi-select") && multiRef.current,
    handler: () => {
      toggleActive();
      moveDown();
    },
  });
  useCommand({
    id: `${commandScope}:toggle-previous`,
    title: "Toggle selection and move up",
    hotkey: "shift+Tab",
    modes: ["insert", "cursor"],
    hidden: true,
    when: () => enabled("multi-select") && multiRef.current,
    handler: () => {
      toggleActive();
      moveUp();
    },
  });

  const surfaceId = useCommandSurfaceId();
  const activeSurface = useActiveCommandSurface();
  const suspended =
    (options.suspended ?? false) || (activeSurface !== null && activeSurface.id !== surfaceId);

  const onFilterKeyDown = useCallback(
    (event: KeyEvent) => {
      if (
        event.name !== "tab" ||
        !multiRef.current ||
        !enabled("multi-select") ||
        modeRef.current !== "insert"
      ) {
        return;
      }
      event.preventDefault();
      toggleActive();
      if (event.shift) moveUp();
      else moveDown();
    },
    [enabled, moveDown, moveUp, toggleActive],
  );

  const controllerRef = useRef<ChooseController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = {
      getFilter: () => filterQueryRef.current,
      setFilter,
      clearFilter: () => setFilter(""),
      moveUp,
      moveDown,
      setActiveIndex,
      getActiveItem,
      getSelectedItems,
      toggleActive,
      submit,
      cancel,
      reload,
      get mode() {
        return modeRef.current;
      },
      setMode: setModeExternal,
    };
  }

  return {
    controller: controllerRef.current,
    state: {
      items,
      matches,
      filterQuery,
      activeIndex,
      activeItem,
      selectedOriginalIndices,
      selectedItems,
      loading,
      error,
      multi,
    },
    view: {
      filterRef,
      mode,
      suspended,
      filterFocused: mode === "insert" && !suspended,
      onFilterInput: setFilter,
      onFilterKeyDown,
    },
  };
}
