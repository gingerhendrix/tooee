import { useCallback, useEffect, useMemo, useRef } from "react";
import type { InputRenderable, KeyEvent } from "@opentui/core";
import { useSelector } from "@xstate/store-react";
import {
  useActiveCommandSurface,
  useActions,
  useCommandSurfaceId,
  useLatest,
  useLazyRef,
  useMode,
  useProvideCommandContext,
  useSetMode,
} from "@tooee/commands";
import type { ActionDefinition, CommandContext, Mode } from "@tooee/commands";
import {
  createChooseStore,
  selectActiveIndex,
  selectError,
  selectFilterQuery,
  selectItems,
  selectLoading,
  selectMatches,
  selectReloadRevision,
  selectSelectedOriginalIndices,
} from "./choose-store.js";
import type { FuzzyMatch } from "./fuzzy.js";
import { chooseSourceError, loadChooseSource } from "./source.js";
import type { ChooseItem, ChooseResult, ChooseSource } from "./types.js";

declare module "@tooee/commands" {
  interface CommandContext {
    /** Contributed by chooser primitives: current filtering and selection state. */
    choose?: {
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
  getFilter: () => string;
  setFilter: (query: string) => void;
  clearFilter: () => void;
  moveUp: () => void;
  moveDown: () => void;
  setActiveIndex: (index: number) => void;
  getActiveItem: () => ChooseItem | undefined;
  getSelectedItems: () => ChooseItem[];
  toggleActive: () => void;
  submit: () => void;
  cancel: () => void;
  reload: () => void;
  readonly mode: Mode;
  setMode: (mode: Mode) => void;
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

interface ChooseCommandContextContribution {
  choose: CommandContext["choose"];
  exit?: () => void;
}

interface ChooseKeymapDefinition extends Omit<ActionDefinition, "group" | "when"> {
  group: () => ChooseCommandGroup;
  when?: () => boolean;
}

/**
 * Shared headless chooser: source lifecycle, fuzzy matches, selection,
 * command context, controller, and all built-in keyboard commands.
 */
export const useChoose = function useChoose(options: UseChooseOptions): UseChooseResult {
  const { source, multi = false, initialFilter = "", commandScope = "choose" } = options;
  const initialItems = Array.isArray(source) ? source : [];
  const store = useLazyRef(() =>
    createChooseStore({
      initialFilter,
      items: initialItems,
      loading: !Array.isArray(source),
    }),
  ).current;
  const filterRef = useRef<InputRenderable>(null);
  const initialArraySourceRef = useLazyRef<ChooseItem[] | null>(() =>
    Array.isArray(source) ? source : null,
  );
  const didHandleInitialSourceRef = useRef(false);

  const items = useSelector(store, (snapshot) => selectItems(snapshot.context));
  const matches = useSelector(store, (snapshot) => selectMatches(snapshot.context));
  const filterQuery = useSelector(store, (snapshot) => selectFilterQuery(snapshot.context));
  const activeIndex = useSelector(store, (snapshot) => selectActiveIndex(snapshot.context));
  const selectedOriginalIndices = useSelector(store, (snapshot) =>
    selectSelectedOriginalIndices(snapshot.context),
  );
  const loading = useSelector(store, (snapshot) => selectLoading(snapshot.context));
  const error = useSelector(store, (snapshot) => selectError(snapshot.context));
  const reloadRevision = useSelector(store, (snapshot) => selectReloadRevision(snapshot.context));
  const activeItem = matches[activeIndex]?.item;
  const selectedItems = useMemo(() => {
    if (!multi) {
      return activeItem === undefined ? [] : [activeItem];
    }
    const selected = [...selectedOriginalIndices].flatMap((index) => {
      const item = items[index];
      return item === undefined ? [] : [item];
    });
    if (selected.length > 0) {
      return selected;
    }
    return activeItem === undefined ? [] : [activeItem];
  }, [multi, activeItem, selectedOriginalIndices, items]);

  const mode = useMode();
  const setMode = useSetMode();
  const optionsRef = useLatest(options);
  const multiRef = useLatest(multi);
  const modeRef = useLatest(mode);

  useEffect(() => {
    let active = true;
    const deactivate = () => {
      active = false;
    };

    // Direct arrays seed the store before the first render. Avoid replacing
    // state after mount, which could overwrite immediate controller calls.
    if (
      !didHandleInitialSourceRef.current &&
      Array.isArray(source) &&
      source === initialArraySourceRef.current
    ) {
      didHandleInitialSourceRef.current = true;
      return deactivate;
    }
    didHandleInitialSourceRef.current = true;

    store.trigger.requestStarted({});
    const { requestId } = store.getSnapshot().context;
    let result: ChooseItem[] | Promise<ChooseItem[]>;
    try {
      result = loadChooseSource(source);
    } catch (loadError) {
      store.trigger.loadFailed({ error: chooseSourceError(loadError), requestId });
      return deactivate;
    }

    if (result instanceof Promise) {
      store.trigger.loadingStarted({ requestId });
      void (async () => {
        try {
          const loaded = await result;
          if (active) {
            store.trigger.loadSucceeded({ items: loaded, requestId });
          }
        } catch (loadError) {
          if (active) {
            store.trigger.loadFailed({ error: chooseSourceError(loadError), requestId });
          }
        }
      })();
      return deactivate;
    }

    store.trigger.loadSucceeded({ items: result, requestId });
    return deactivate;
  }, [source, reloadRevision, store, initialArraySourceRef]);

  const setFilter = useCallback(
    (query: string) => {
      store.trigger.filterChanged({ query });
    },
    [store],
  );
  const updateActiveIndex = useCallback(
    (index: number) => {
      store.trigger.activeIndexSet({ index });
    },
    [store],
  );
  const moveUp = useCallback(() => {
    store.trigger.moved({ delta: -1 });
  }, [store]);
  const moveDown = useCallback(() => {
    store.trigger.moved({ delta: 1 });
  }, [store]);
  const getActiveItem = useCallback(() => {
    const { context } = store.getSnapshot();
    return context.matches[context.activeIndex]?.item;
  }, [store]);
  const getSelectedItems = useCallback((): ChooseItem[] => {
    const { context } = store.getSnapshot();
    const active = context.matches[context.activeIndex]?.item;
    if (!multiRef.current) {
      return active === undefined ? [] : [active];
    }
    const selected = [...context.selectedOriginalIndices].flatMap((index) => {
      const item = context.items[index];
      return item === undefined ? [] : [item];
    });
    if (selected.length > 0) {
      return selected;
    }
    return active === undefined ? [] : [active];
  }, [multiRef, store]);
  const toggleActive = useCallback(() => {
    if (multiRef.current) {
      store.trigger.activeToggled({});
    }
  }, [multiRef, store]);
  const submit = useCallback(() => {
    void optionsRef.current.onSubmit({ items: getSelectedItems() });
  }, [getSelectedItems, optionsRef]);
  const cancel = useCallback(() => optionsRef.current.onCancel?.(), [optionsRef]);
  const reload = useCallback(() => {
    store.trigger.reloadRequested({});
  }, [store]);
  const setModeExternal = useCallback(
    (nextMode: Mode) => {
      setMode(nextMode);
    },
    [setMode],
  );

  useProvideCommandContext(() => {
    const context: ChooseCommandContextContribution = {
      choose: {
        activeItem: getActiveItem(),
        filterQuery: store.getSnapshot().context.filterQuery,
        selectedItems: getSelectedItems(),
      },
    };
    if (optionsRef.current.onCancel !== undefined) {
      context.exit = cancel;
    }
    return context;
  });

  useActions(options.commands);

  const enabled = useCallback(
    (group: ChooseCommandGroup) => !(optionsRef.current.disable?.includes(group) ?? false),
    [optionsRef],
  );
  const builtInActions = useMemo<ActionDefinition[]>(() => {
    const definitions: ChooseKeymapDefinition[] = [
      {
        group: () => (modeRef.current === "insert" ? "mode" : "cancel"),
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
          modeRef.current === "insert" ? true : optionsRef.current.onCancel !== undefined,
      },
      {
        group: () => "cancel",
        handler: cancel,
        hidden: true,
        hotkey: "q",
        id: `${commandScope}:cancel`,
        modes: ["cursor"],
        title: "Cancel",
        when: () => optionsRef.current.onCancel !== undefined,
      },
      {
        group: () => "mode",
        handler: () => {
          setMode("insert");
        },
        hidden: true,
        hotkey: "i",
        id: `${commandScope}:insert-mode-i`,
        modes: ["cursor"],
        title: "Insert mode",
      },
      {
        group: () => "mode",
        handler: () => {
          setMode("insert");
        },
        hidden: true,
        hotkey: "a",
        id: `${commandScope}:insert-mode-a`,
        modes: ["cursor"],
        title: "Insert mode",
      },
      {
        group: () => "navigation",
        handler: moveDown,
        hidden: true,
        hotkey: "j",
        id: `${commandScope}:move-down-vim`,
        modes: ["cursor"],
        title: "Move down",
      },
      {
        group: () => "navigation",
        handler: moveUp,
        hidden: true,
        hotkey: "k",
        id: `${commandScope}:move-up-vim`,
        modes: ["cursor"],
        title: "Move up",
      },
      {
        group: () => "submit",
        handler: submit,
        hidden: true,
        hotkey: "Enter",
        id: `${commandScope}:confirm`,
        modes: ["insert", "cursor"],
        title: "Confirm",
      },
      {
        group: () => "navigation",
        handler: moveUp,
        hidden: true,
        hotkey: "up",
        id: `${commandScope}:move-up`,
        modes: ["insert", "cursor"],
        title: "Move up",
      },
      {
        group: () => "navigation",
        handler: moveUp,
        hidden: true,
        hotkey: "ctrl+p",
        id: `${commandScope}:move-up-ctrl-p`,
        modes: ["insert", "cursor"],
        title: "Move up",
      },
      {
        group: () => "navigation",
        handler: moveDown,
        hidden: true,
        hotkey: "down",
        id: `${commandScope}:move-down`,
        modes: ["insert", "cursor"],
        title: "Move down",
      },
      {
        group: () => "navigation",
        handler: moveDown,
        hidden: true,
        hotkey: "ctrl+n",
        id: `${commandScope}:move-down-ctrl-n`,
        modes: ["insert", "cursor"],
        title: "Move down",
      },
      {
        group: () => "multi-select",
        handler: () => {
          toggleActive();
          moveDown();
        },
        hidden: true,
        hotkey: "Tab",
        id: `${commandScope}:toggle-next`,
        modes: ["insert", "cursor"],
        title: "Toggle selection and move down",
        when: () => multiRef.current,
      },
      {
        group: () => "multi-select",
        handler: () => {
          toggleActive();
          moveUp();
        },
        hidden: true,
        hotkey: "shift+Tab",
        id: `${commandScope}:toggle-previous`,
        modes: ["insert", "cursor"],
        title: "Toggle selection and move up",
        when: () => multiRef.current,
      },
    ];
    return definitions.map(({ group, when, ...definition }) => ({
      ...definition,
      when: () => enabled(group()) && (when?.() ?? true),
    }));
  }, [
    cancel,
    commandScope,
    enabled,
    modeRef,
    moveDown,
    moveUp,
    multiRef,
    optionsRef,
    setMode,
    submit,
    toggleActive,
  ]);
  useActions(builtInActions);

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
    [enabled, modeRef, moveDown, moveUp, multiRef, toggleActive],
  );

  const controller = useLazyRef<ChooseController>(() => ({
    cancel,
    clearFilter: () => {
      setFilter("");
    },
    getActiveItem,
    getFilter: () => store.getSnapshot().context.filterQuery,
    getSelectedItems,
    get mode() {
      return modeRef.current;
    },
    moveDown,
    moveUp,
    reload,
    setActiveIndex: updateActiveIndex,
    setFilter,
    setMode: setModeExternal,
    submit,
    toggleActive,
  })).current;

  return {
    controller,
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
