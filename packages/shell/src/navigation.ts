import { useCallback, useMemo } from "react";
import { useTerminalDimensions } from "@opentui/react";
import { useSelector } from "@xstate/store-react";
import { useCommand, useMode, useSetMode, type Mode } from "@tooee/commands";
import {
  deriveSelection,
  selectCursor,
  selectRowKeys,
  selectSelectionAnchor,
  selectToggledKeys,
  useNavSearchStore,
  type NavSearchStore,
} from "@tooee/search";

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

export function useNavigationBindings(
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
  const setCursor = useCallback((index: number) => store.trigger.setCursor({ index }), [store]);

  useCommand({
    id: "cursor-down",
    title: "Cursor down",
    hotkey: "j",
    modes: CURSOR_MODES,
    handler: () => store.trigger.move({ delta: 1 }),
  });
  useCommand({
    id: "cursor-up",
    title: "Cursor up",
    hotkey: "k",
    modes: CURSOR_MODES,
    handler: () => store.trigger.move({ delta: -1 }),
  });
  useCommand({
    id: "cursor-half-down",
    title: "Cursor half page down",
    hotkey: "ctrl+d",
    modes: CURSOR_MODES,
    handler: () => store.trigger.move({ delta: halfPage }),
  });
  useCommand({
    id: "cursor-half-up",
    title: "Cursor half page up",
    hotkey: "ctrl+u",
    modes: CURSOR_MODES,
    handler: () => store.trigger.move({ delta: -halfPage }),
  });
  useCommand({
    id: "cursor-top",
    title: "Cursor to top",
    hotkey: "g g",
    modes: CURSOR_MODES,
    handler: () => store.trigger.jump({ index: 0, direction: 1 }),
  });
  useCommand({
    id: "cursor-bottom",
    title: "Cursor to bottom",
    hotkey: "shift+g",
    modes: CURSOR_MODES,
    handler: () =>
      store.trigger.jump({ index: store.getSnapshot().context.rowKeys.length - 1, direction: -1 }),
  });
  useCommand({
    id: "enter-select",
    title: "Enter select mode",
    hotkey: "v",
    modes: CURSOR_MODES,
    handler: () => {
      store.trigger.enterSelect({});
      setMode("select");
    },
  });
  useCommand({
    id: "cursor-toggle",
    title: "Toggle selection",
    hotkey: "tab",
    modes: CURSOR_MODES,
    when: () => multiSelect,
    handler: () => store.trigger.toggleCurrent({}),
  });
  useCommand({
    id: "cursor-toggle-up",
    title: "Toggle and move up",
    hotkey: "shift+tab",
    modes: CURSOR_MODES,
    when: () => multiSelect,
    handler: () => store.trigger.toggleAndMove({ delta: -1 }),
  });
  useCommand({
    id: "select-down",
    title: "Extend selection down",
    hotkey: "j",
    modes: SELECT_MODES,
    handler: () => store.trigger.move({ delta: 1 }),
  });
  useCommand({
    id: "select-up",
    title: "Extend selection up",
    hotkey: "k",
    modes: SELECT_MODES,
    handler: () => store.trigger.move({ delta: -1 }),
  });
  useCommand({
    id: "select-toggle",
    title: "Toggle selection",
    hotkey: "tab",
    modes: SELECT_MODES,
    when: () => multiSelect,
    handler: () => store.trigger.toggleCurrent({}),
  });
  useCommand({
    id: "select-cancel",
    title: "Cancel selection",
    hotkey: "escape",
    modes: SELECT_MODES,
    handler: () => {
      store.trigger.cancelSelect({});
      setMode("cursor");
    },
  });

  const context = store.getSnapshot().context;
  const toggledIndices = new Set<number>();
  rowKeys.forEach((key, index) => {
    if (toggledKeys.has(key)) toggledIndices.add(index);
  });
  const selection =
    mode === "select" && anchor !== null && cursor !== null
      ? deriveSelection({ ...context, selectionAnchor: anchor, cursor }, mode)
      : null;
  return { cursor, setCursor, selection, toggledIndices };
}

export function useNavigation(options: UseNavigationOptions): NavigationState {
  const keys = useMemo(
    () => Array.from({ length: options.rowCount }, (_, index) => index),
    [options.rowCount],
  );
  const store = useNavSearchStore({ keys, isSelectable: options.isSelectable });
  return useNavigationBindings(store, options);
}
