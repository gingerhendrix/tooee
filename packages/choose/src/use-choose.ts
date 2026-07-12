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
} from "@tooee/commands";
import type { ActionDefinition, Mode } from "@tooee/commands";
import { fuzzyFilter } from "./fuzzy.js";
import type { FuzzyMatch } from "./fuzzy.js";
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
export const useChoose = function useChoose(options: UseChooseOptions): UseChooseResult {
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
    if (!multi) {
      return activeItem ? [activeItem] : [];
    }
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
      if (requestId !== requestIdRef.current) {
        return;
      }
      replaceItems([]);
      setError(chooseSourceError(loadError));
      setLoading(false);
      return;
    }

    if (result instanceof Promise) {
      setLoading(true);
      void result.then(
        (loaded) => {
          if (!active || requestId !== requestIdRef.current) {
            return;
          }
          replaceItems(loaded);
          setError(null);
          setLoading(false);
        },
        (loadError: unknown) => {
          if (!active || requestId !== requestIdRef.current) {
            return;
          }
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

  const moveUp = useCallback(() => {
    setActiveIndex(activeIndexRef.current - 1);
  }, [setActiveIndex]);
  const moveDown = useCallback(() => {
    setActiveIndex(activeIndexRef.current + 1);
  }, [setActiveIndex]);

  const getActiveItem = useCallback(() => matchesRef.current[activeIndexRef.current]?.item, []);

  const getSelectedItems = useCallback((): ChooseItem[] => {
    const active = getActiveItem();
    if (!multiRef.current) {
      return active ? [active] : [];
    }
    const selected = Array.from(selectedRef.current).flatMap((index) => {
      const item = itemsRef.current[index];
      return item ? [item] : [];
    });
    return selected.length > 0 ? selected : active ? [active] : [];
  }, [getActiveItem]);

  const toggleActive = useCallback(() => {
    if (!multiRef.current) {
      return;
    }
    const originalIndex = matchesRef.current[activeIndexRef.current]?.originalIndex;
    if (originalIndex === undefined) {
      return;
    }
    const next = new Set(selectedRef.current);
    if (next.has(originalIndex)) {
      next.delete(originalIndex);
    } else {
      next.add(originalIndex);
    }
    selectedRef.current = next;
    setSelectedOriginalIndices(next);
  }, []);

  const submit = useCallback(() => {
    void optionsRef.current.onSubmit({ items: getSelectedItems() });
  }, [getSelectedItems]);

  const cancel = useCallback(() => optionsRef.current.onCancel?.(), []);
  const reload = useCallback(() => {
    setReloadRevision((revision) => revision + 1);
  }, []);
  const setModeExternal = useCallback(
    (nextMode: Mode) => {
      setMode(nextMode);
    },
    [setMode],
  );

  useProvideCommandContext(() => ({
    choose: {
      activeItem: getActiveItem(),
      filterQuery: filterQueryRef.current,
      selectedItems: getSelectedItems(),
    },
    ...(optionsRef.current.onCancel ? { exit: cancel } : {}),
  }));

  useActions(options.commands);

  const enabled = useCallback(
    (group: ChooseCommandGroup) => !(optionsRef.current.disable?.includes(group) ?? false),
    [],
  );

  useCommand({
    handler: () => {
      if (modeRef.current === "insert") {
        setMode("cursor");
      } else {
        cancel();
      }
    },
    hidden: true,
    hotkey: "Escape",
    id: `${commandScope}:escape`,
    modes: ["insert", "cursor"],
    title: "Back / cancel",
    when: () =>
      modeRef.current === "insert"
        ? enabled("mode")
        : enabled("cancel") && optionsRef.current.onCancel !== undefined,
  });
  useCommand({
    handler: cancel,
    hidden: true,
    hotkey: "q",
    id: `${commandScope}:cancel`,
    modes: ["cursor"],
    title: "Cancel",
    when: () => enabled("cancel") && optionsRef.current.onCancel !== undefined,
  });
  useCommand({
    handler: () => {
      setMode("insert");
    },
    hidden: true,
    hotkey: "i",
    id: `${commandScope}:insert-mode-i`,
    modes: ["cursor"],
    title: "Insert mode",
    when: () => enabled("mode"),
  });
  useCommand({
    handler: () => {
      setMode("insert");
    },
    hidden: true,
    hotkey: "a",
    id: `${commandScope}:insert-mode-a`,
    modes: ["cursor"],
    title: "Insert mode",
    when: () => enabled("mode"),
  });
  useCommand({
    handler: moveDown,
    hidden: true,
    hotkey: "j",
    id: `${commandScope}:move-down-vim`,
    modes: ["cursor"],
    title: "Move down",
    when: () => enabled("navigation"),
  });
  useCommand({
    handler: moveUp,
    hidden: true,
    hotkey: "k",
    id: `${commandScope}:move-up-vim`,
    modes: ["cursor"],
    title: "Move up",
    when: () => enabled("navigation"),
  });
  useCommand({
    handler: submit,
    hidden: true,
    hotkey: "Enter",
    id: `${commandScope}:confirm`,
    modes: ["insert", "cursor"],
    title: "Confirm",
    when: () => enabled("submit"),
  });
  useCommand({
    handler: moveUp,
    hidden: true,
    hotkey: "up",
    id: `${commandScope}:move-up`,
    modes: ["insert", "cursor"],
    title: "Move up",
    when: () => enabled("navigation"),
  });
  useCommand({
    handler: moveUp,
    hidden: true,
    hotkey: "ctrl+p",
    id: `${commandScope}:move-up-ctrl-p`,
    modes: ["insert", "cursor"],
    title: "Move up",
    when: () => enabled("navigation"),
  });
  useCommand({
    handler: moveDown,
    hidden: true,
    hotkey: "down",
    id: `${commandScope}:move-down`,
    modes: ["insert", "cursor"],
    title: "Move down",
    when: () => enabled("navigation"),
  });
  useCommand({
    handler: moveDown,
    hidden: true,
    hotkey: "ctrl+n",
    id: `${commandScope}:move-down-ctrl-n`,
    modes: ["insert", "cursor"],
    title: "Move down",
    when: () => enabled("navigation"),
  });
  useCommand({
    handler: () => {
      toggleActive();
      moveDown();
    },
    hidden: true,
    hotkey: "Tab",
    id: `${commandScope}:toggle-next`,
    modes: ["insert", "cursor"],
    title: "Toggle selection and move down",
    when: () => enabled("multi-select") && multiRef.current,
  });
  useCommand({
    handler: () => {
      toggleActive();
      moveUp();
    },
    hidden: true,
    hotkey: "shift+Tab",
    id: `${commandScope}:toggle-previous`,
    modes: ["insert", "cursor"],
    title: "Toggle selection and move up",
    when: () => enabled("multi-select") && multiRef.current,
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
      if (event.shift) {
        moveUp();
      } else {
        moveDown();
      }
    },
    [enabled, moveDown, moveUp, toggleActive],
  );

  const controllerRef = useRef<ChooseController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = {
      cancel,
      clearFilter: () => {
        setFilter("");
      },
      getActiveItem,
      getFilter: () => filterQueryRef.current,
      getSelectedItems,
      get mode() {
        return modeRef.current;
      },
      moveDown,
      moveUp,
      reload,
      setActiveIndex,
      setFilter,
      setMode: setModeExternal,
      submit,
      toggleActive,
    };
  }

  return {
    controller: controllerRef.current,
    state: {
      activeIndex,
      activeItem,
      error,
      filterQuery,
      items,
      loading,
      matches,
      multi,
      selectedItems,
      selectedOriginalIndices,
    },
    view: {
      filterFocused: mode === "insert" && !suspended,
      filterRef,
      mode,
      onFilterInput: setFilter,
      onFilterKeyDown,
      suspended,
    },
  };
};
