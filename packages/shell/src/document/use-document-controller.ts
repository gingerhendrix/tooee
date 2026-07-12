import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Key } from "react";
import type { MouseEvent } from "@opentui/core";
import { useBuildCommandContext, useCommandContext } from "@tooee/commands";
import { useHasModalOverlay } from "@tooee/overlays";
import type { ContextMenuEntry, DecorationLayer, RowDocumentRenderable } from "@tooee/renderers";
import { useNavSearchStore, useSearchBindings } from "@tooee/search";
import { useTheme } from "@tooee/themes";
import type { ActionDefinition, CommandContext } from "@tooee/commands";
import { actionsToContextMenuEntries, useContextMenu } from "../context-menu.js";
import { useCopy } from "../copy-hook.js";
import { useNavigationBindings } from "../navigation.js";
import { buildInteractionDecorations } from "./decorations.js";
import type {
  DocumentContextMenuItems,
  DocumentController,
  DocumentRowAdapter,
  DocumentRowAnchor,
  UseDocumentControllerOptions,
} from "./types.js";

const EMPTY_LAYERS: readonly DecorationLayer[] = [];
const EMPTY_MATCHES: readonly number[] = [];
const EMPTY_ROWS: readonly never[] = [];
const EMPTY_ANCHORS: readonly never[] = [];

const rowKey = function rowKey<T>(
  adapter: DocumentRowAdapter<T>,
  row: T | undefined,
  index: number,
): Key {
  return adapter.getKey && row !== undefined ? adapter.getKey(row, index) : index;
};

/** Build the anchor for a row from the current rows + adapter, or `null` if out of range. */
const makeAnchor = function makeAnchor<T>(
  rows: readonly T[],
  adapter: DocumentRowAdapter<T>,
  index: number,
): DocumentRowAnchor<T> | null {
  const row = rows[index];
  if (row === undefined) {
    return null;
  }
  return {
    index,
    key: rowKey(adapter, row, index),
    row,
    source: adapter.getSource?.(row, index) ?? null,
    text: adapter.getText(row, index),
  };
};

/**
 * Menu items may be prepared entries or the consumer's own action definitions;
 * an action is anything with a `handler`. Actions are projected through
 * `actionsToContextMenuEntries`, which drops `hidden` actions and actions
 * whose `when` rejects the context the menu is opening in.
 */
const resolveContextMenuEntries = function resolveContextMenuEntries(
  items: DocumentContextMenuItems,
  context: CommandContext,
): ContextMenuEntry[] {
  const [first] = items;
  if (first !== undefined && "handler" in first) {
    return actionsToContextMenuEntries(items as readonly ActionDefinition[], context);
  }
  return [...(items as readonly ContextMenuEntry[])];
};

const defaultMatch = function defaultMatch<T>(
  query: string,
  rows: readonly T[],
  getText: (row: T, index: number) => string,
): number[] {
  const lowered = query.toLowerCase();
  const matches: number[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    if (getText(rows[index]!, index).toLowerCase().includes(lowered)) {
      matches.push(index);
    }
  }
  return matches;
};

/**
 * The headless row model and interaction controller behind a row document:
 * identity, navigation, selection, search, copy, decorations, scroll-follow,
 * and mouse. The typed row collection is the single source of truth — row
 * count, rendered children, search results, copy text, and the active row all
 * derive from it, so they cannot drift apart.
 */
export const useDocumentController = function useDocumentController<T>(
  options: UseDocumentControllerOptions<T>,
): DocumentController<T> {
  const {
    rows,
    adapter,
    multiSelect = false,
    search: searchOptions,
    copy = true,
    decorations: externalDecorations = EMPTY_LAYERS,
    preserveCursorByKey = false,
    onRowPress,
    contextMenu: contextMenuOptions,
  } = options;

  const { theme } = useTheme();
  const ref = useRef<RowDocumentRenderable | null>(null);

  // Callers pass fresh object/closure literals every render; read them through
  // refs so command registrations and bound handlers stay stable.
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;
  const onRowPressRef = useRef(onRowPress);
  onRowPressRef.current = onRowPress;
  const contextMenuOptionsRef = useRef(contextMenuOptions);
  contextMenuOptionsRef.current = contextMenuOptions;

  const getRow = useCallback((index: number): T | undefined => rowsRef.current[index], []);

  const getRowKey = useCallback(
    (index: number): Key => rowKey(adapterRef.current, rowsRef.current[index], index),
    [],
  );

  const getRowText = useCallback((index: number): string => {
    const row = rowsRef.current[index];
    return row === undefined ? "" : adapterRef.current.getText(row, index);
  }, []);

  // Closes over `rows` rather than the ref so navigation's index resolver is
  // invalidated when the collection (and therefore selectability) changes.
  const isSelectable = useMemo(
    () =>
      (index: number): boolean => {
        const row = rows[index];
        if (row === undefined) {
          return false;
        }
        return adapterRef.current.isSelectable?.(row, index) ?? true;
      },
    [rows],
  );

  const rowKeys = useMemo(
    () => rows.map((row, index) => rowKey(adapterRef.current, row, index)),
    [rows],
  );
  const navSearchStore = useNavSearchStore({
    isSelectable,
    keys: rowKeys,
    preserveCursorByKey,
  });
  const navigation = useNavigationBindings(navSearchStore, { multiSelect });
  const { setCursor, toggledIndices } = navigation;

  // -- Search ---------------------------------------------------------------

  const searchEnabled = searchOptions !== false;
  const matchRef = useRef(searchOptions === false ? undefined : searchOptions?.match);
  matchRef.current = searchOptions === false ? undefined : searchOptions?.match;

  const match = useCallback((query: string): number[] => {
    const currentRows = rowsRef.current;
    const custom = matchRef.current;
    if (custom) {
      return [...custom(query, currentRows)];
    }
    return defaultMatch(query, currentRows, (row, index) => adapterRef.current.getText(row, index));
  }, []);

  // Rows are the searched content: a committed query re-matches when they change.
  const searchState = useSearchBindings(navSearchStore, {
    deps: [rows],
    enabled: searchEnabled,
    match,
  });
  const search = searchEnabled ? searchState : null;

  // -- Copy -----------------------------------------------------------------

  useCopy({
    cursor: navigation.cursor,
    enabled: copy,
    getRowText,
    selection: navigation.selection,
    toggledIndices,
  });

  // -- Derived rows ---------------------------------------------------------

  const activeIndex =
    navigation.cursor !== null && navigation.cursor < rows.length ? navigation.cursor : null;
  const activeRow = activeIndex === null ? undefined : rows[activeIndex];
  const activeKey = activeIndex !== null ? rowKey(adapter, activeRow, activeIndex) : null;

  const selectedIndices = useMemo<readonly number[]>(() => {
    if (toggledIndices.size > 0) {
      return Array.from(toggledIndices).toSorted((left, right) => left - right);
    }
    if (navigation.selection) {
      const indices: number[] = [];
      for (let index = navigation.selection.start; index <= navigation.selection.end; index += 1) {
        indices.push(index);
      }
      return indices;
    }
    return EMPTY_ROWS;
  }, [toggledIndices, navigation.selection]);

  const selectedRows = useMemo<readonly T[]>(
    () =>
      selectedIndices.length === 0 ? EMPTY_ROWS : selectedIndices.map((index) => rows[index]!),
    [selectedIndices, rows],
  );

  // Anchors are derived on demand from the current rows + adapter, so they can
  // never drift from the rows the controller actually navigates.
  const getAnchor = useCallback(
    (index: number): DocumentRowAnchor<T> | null =>
      makeAnchor(rowsRef.current, adapterRef.current, index),
    [],
  );

  const activeAnchor = useMemo<DocumentRowAnchor<T> | null>(
    () => (activeIndex === null ? null : makeAnchor(rows, adapter, activeIndex)),
    [rows, adapter, activeIndex],
  );

  const selectedAnchors = useMemo<readonly DocumentRowAnchor<T>[]>(() => {
    if (selectedIndices.length === 0) {
      return EMPTY_ANCHORS;
    }
    const anchors: DocumentRowAnchor<T>[] = [];
    for (const index of selectedIndices) {
      const anchor = makeAnchor(rows, adapter, index);
      if (anchor) {
        anchors.push(anchor);
      }
    }
    return anchors;
  }, [selectedIndices, rows, adapter]);

  // -- Decorations ----------------------------------------------------------

  const interactionDecorations = useMemo(
    () =>
      buildInteractionDecorations({
        currentMatchIndex: search?.currentMatchIndex ?? 0,
        cursor: navigation.cursor,
        matchingLines: search?.matchingLines ?? EMPTY_MATCHES,
        selection: navigation.selection,
        theme,
        toggledIndices,
      }),
    [
      navigation.cursor,
      navigation.selection,
      toggledIndices,
      search?.matchingLines,
      search?.currentMatchIndex,
      theme,
    ],
  );

  const decorations = useMemo(
    () =>
      externalDecorations.length === 0
        ? interactionDecorations
        : [...interactionDecorations, ...externalDecorations],
    [interactionDecorations, externalDecorations],
  );

  // -- Scroll follow --------------------------------------------------------

  const { cursor } = navigation;
  useEffect(() => {
    const document = ref.current;
    if (!document || cursor === null) {
      return;
    }

    if (document.getRowMetrics(cursor)) {
      document.scrollToRow(cursor, "nearest");
      return;
    }

    // Geometry is computed during render, so the first cursor effect after a
    // mount or a row change finds no metrics. Follow once it exists.
    const onGeometry = () => {
      document.off("row-geometry-change", onGeometry);
      document.scrollToRow(cursor, "nearest");
    };
    document.on("row-geometry-change", onGeometry);
    return () => {
      document.off("row-geometry-change", onGeometry);
    };
  }, [cursor, rows]);

  // -- Mouse ----------------------------------------------------------------

  const hasModalOverlay = useHasModalOverlay();
  const hasModalOverlayRef = useRef(hasModalOverlay);
  hasModalOverlayRef.current = hasModalOverlay;

  const contextMenuController = useContextMenu();
  const buildCommandContext = useBuildCommandContext();
  const { invoke } = useCommandContext();
  const invokeRef = useRef(invoke);
  invokeRef.current = invoke;

  const getRowAtScreenY = useCallback(
    (screenY: number) => {
      const index = ref.current?.getRowAtScreenY(screenY);
      if (index == null || index < 0 || index >= rowsRef.current.length) {
        return null;
      }
      return { index, key: getRowKey(index), row: rowsRef.current[index]! };
    },
    [getRowKey],
  );

  // Row mouse handlers stand down while a modal overlay is up: centered
  // overlays leave clickable margins, and mouse events route through the
  // hit-grid, bypassing command-surface arbitration.
  const selectRow = useCallback(
    (index: number) => {
      if (hasModalOverlayRef.current) {
        return;
      }
      if (index < 0 || index >= rowsRef.current.length) {
        return;
      }
      setCursor(index);
    },
    [setCursor],
  );

  const openContextMenu = contextMenuController.open;
  const onMouseDown = useCallback(
    (event: MouseEvent) => {
      if (hasModalOverlayRef.current) {
        return;
      }

      const hit = getRowAtScreenY(event.y);
      if (!hit) {
        return;
      }

      if (event.button === 0) {
        selectRow(hit.index);
        onRowPressRef.current?.({ ...hit, event });
        return;
      }

      if (event.button !== 2) {
        return;
      }
      const menu = contextMenuOptionsRef.current;
      if (menu === false || menu === undefined) {
        return;
      }

      event.preventDefault();
      selectRow(hit.index);

      // The event's row/index/key identify the clicked row for row-dependent
      // menus. The command context is the pre-click commit (the selection has
      // not re-rendered yet); registry `invoke` re-checks `when` with a fresh
      // context when an entry is actually chosen, after selection commits.
      const context = buildCommandContext();
      const items = typeof menu === "function" ? menu({ ...hit, context, event }) : menu;
      const entries = resolveContextMenuEntries(items, context);
      if (entries.length === 0) {
        return;
      }
      openContextMenu(event.x, event.y, entries, (id) => {
        invokeRef.current(id);
      });
    },
    [getRowAtScreenY, selectRow, openContextMenu, buildCommandContext],
  );

  return useMemo(
    () => ({
      activeAnchor,
      activeIndex,
      activeKey,
      activeRow,
      decorations,
      getAnchor,
      getRow,
      getRowAtScreenY,
      getRowKey,
      navigation: { ...navigation, toggledIndices },
      onMouseDown,
      ref,
      rows,
      search,
      selectRow,
      selectedAnchors,
      selectedRows,
      toggledIndices,
    }),
    [
      rows,
      navigation,
      search,
      activeIndex,
      activeKey,
      activeRow,
      selectedRows,
      activeAnchor,
      selectedAnchors,
      toggledIndices,
      decorations,
      getRow,
      getRowKey,
      getAnchor,
      getRowAtScreenY,
      selectRow,
      onMouseDown,
    ],
  );
};
