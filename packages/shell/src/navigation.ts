import { useCallback, useMemo } from "react";
import { useTerminalDimensions } from "@opentui/react";
import { useSelector } from "@xstate/store-react";
import { useActions, useMode, useSetMode } from "@tooee/commands";
import type { ActionDefinition, Mode } from "@tooee/commands";
import {
  deriveSelection,
  selectCursor,
  selectRowKeys,
  selectSelectionAnchor,
  selectToggledKeys,
  useNavSearchStore,
} from "@tooee/search";
import type { NavSearchStore } from "@tooee/search";

const CURSOR_MODES: Mode[] = ["cursor"];
const SELECT_MODES: Mode[] = ["select"];

export interface UseNavigationOptions {
  rowCount: number;
  isSelectable?: (index: number) => boolean;
  viewportHeight?: number;
  multiSelect?: boolean;
}

export interface NavigationState {
  cursor: number | null;
  setCursor: (line: number) => void;
  selection: { start: number; end: number } | null;
  toggledIndices: Set<number>;
}

type NavigationCommandGroup = "cursor" | "select" | "multi-select";

interface NavigationKeymapDefinition extends Omit<ActionDefinition, "group" | "when"> {
  group: NavigationCommandGroup;
}

export const useNavigationBindings = function useNavigationBindings(
  store: NavSearchStore,
  {
    viewportHeight,
    multiSelect = false,
  }: Pick<UseNavigationOptions, "viewportHeight" | "multiSelect">,
): NavigationState {
  const { height } = useTerminalDimensions();
  const halfPage = Math.floor((viewportHeight ?? Math.max(1, height - 2)) / 2) || 1;
  const mode = useMode();
  const setMode = useSetMode();
  const cursor = useSelector(store, (snapshot) => selectCursor(snapshot.context));
  const anchor = useSelector(store, (snapshot) => selectSelectionAnchor(snapshot.context));
  const toggledKeys = useSelector(store, (snapshot) => selectToggledKeys(snapshot.context));
  const rowKeys = useSelector(store, (snapshot) => selectRowKeys(snapshot.context));
  const setCursor = useCallback(
    (index: number) => {
      store.trigger.setCursor({ index });
    },
    [store],
  );

  const actions = useMemo<ActionDefinition[]>(() => {
    const definitions: NavigationKeymapDefinition[] = [
      {
        group: "cursor",
        handler: () => {
          store.trigger.move({ delta: 1 });
        },
        hotkey: "j",
        id: "cursor-down",
        modes: CURSOR_MODES,
        title: "Cursor down",
      },
      {
        group: "cursor",
        handler: () => {
          store.trigger.move({ delta: -1 });
        },
        hotkey: "k",
        id: "cursor-up",
        modes: CURSOR_MODES,
        title: "Cursor up",
      },
      {
        group: "cursor",
        handler: () => {
          store.trigger.move({ delta: halfPage });
        },
        hotkey: "ctrl+d",
        id: "cursor-half-down",
        modes: CURSOR_MODES,
        title: "Cursor half page down",
      },
      {
        group: "cursor",
        handler: () => {
          store.trigger.move({ delta: -halfPage });
        },
        hotkey: "ctrl+u",
        id: "cursor-half-up",
        modes: CURSOR_MODES,
        title: "Cursor half page up",
      },
      {
        group: "cursor",
        handler: () => {
          store.trigger.jump({ direction: 1, index: 0 });
        },
        hotkey: "g g",
        id: "cursor-top",
        modes: CURSOR_MODES,
        title: "Cursor to top",
      },
      {
        group: "cursor",
        handler: () => {
          store.trigger.jump({
            direction: -1,
            index: store.getSnapshot().context.rowKeys.length - 1,
          });
        },
        hotkey: "shift+g",
        id: "cursor-bottom",
        modes: CURSOR_MODES,
        title: "Cursor to bottom",
      },
      {
        group: "cursor",
        handler: () => {
          store.trigger.enterSelect({});
          setMode("select");
        },
        hotkey: "v",
        id: "enter-select",
        modes: CURSOR_MODES,
        title: "Enter select mode",
      },
      {
        group: "multi-select",
        handler: () => {
          store.trigger.toggleCurrent({});
        },
        hotkey: "tab",
        id: "cursor-toggle",
        modes: CURSOR_MODES,
        title: "Toggle selection",
      },
      {
        group: "multi-select",
        handler: () => {
          store.trigger.toggleAndMove({ delta: -1 });
        },
        hotkey: "shift+tab",
        id: "cursor-toggle-up",
        modes: CURSOR_MODES,
        title: "Toggle and move up",
      },
      {
        group: "select",
        handler: () => {
          store.trigger.move({ delta: 1 });
        },
        hotkey: "j",
        id: "select-down",
        modes: SELECT_MODES,
        title: "Extend selection down",
      },
      {
        group: "select",
        handler: () => {
          store.trigger.move({ delta: -1 });
        },
        hotkey: "k",
        id: "select-up",
        modes: SELECT_MODES,
        title: "Extend selection up",
      },
      {
        group: "multi-select",
        handler: () => {
          store.trigger.toggleCurrent({});
        },
        hotkey: "tab",
        id: "select-toggle",
        modes: SELECT_MODES,
        title: "Toggle selection",
      },
      {
        group: "select",
        handler: () => {
          store.trigger.cancelSelect({});
          setMode("cursor");
        },
        hotkey: "escape",
        id: "select-cancel",
        modes: SELECT_MODES,
        title: "Cancel selection",
      },
    ];
    return definitions.map(({ group, ...definition }) => ({
      ...definition,
      when: group === "multi-select" ? () => multiSelect : undefined,
    }));
  }, [halfPage, multiSelect, setMode, store]);
  useActions(actions);

  const { context } = store.getSnapshot();
  const toggledIndices = new Set<number>();
  for (const [index, key] of rowKeys.entries()) {
    if (toggledKeys.has(key)) {
      toggledIndices.add(index);
    }
  }
  const selection =
    mode === "select" && anchor !== null && cursor !== null
      ? deriveSelection({ ...context, cursor, selectionAnchor: anchor }, mode)
      : null;
  return { cursor, selection, setCursor, toggledIndices };
};

export const useNavigation = function useNavigation(
  options: UseNavigationOptions,
): NavigationState {
  const keys = useMemo(
    () => Array.from({ length: options.rowCount }, (_, index) => index),
    [options.rowCount],
  );
  const store = useNavSearchStore({ isSelectable: options.isSelectable, keys });
  return useNavigationBindings(store, options);
};
