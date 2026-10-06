import { useActions, useCommandGroup } from "@tooee/commands";
import type { ActionDefinition, CommandContext, CommandHandler } from "@tooee/commands";
import type { DecorationLayer } from "@tooee/renderers";
import type { NavigationState } from "@tooee/shell";
import { useMemo, useState } from "react";
import type { Key } from "react";

import { projectDecorationLayers } from "./fold-decorations.js";
import { computeFoldView, foldsAt, visibleAnchorRow } from "./fold-model.js";
import type { FoldRange, FoldView } from "./fold-model.js";

const EMPTY_KEYS: ReadonlySet<Key> = new Set();

/** Fold state over a full row array and the visible projection it produces. */
export interface FoldState<T> {
  /** The visible rows: pass this array to the document controller and the renderer. */
  rows: readonly T[];
  /** The full-array row count. */
  rowCount: number;
  ranges: readonly FoldRange[];
  view: FoldView;
  closedKeys: ReadonlySet<Key>;
  setClosedKeys: (keys: ReadonlySet<Key>) => void;
  /** External decoration layers projected onto the visible rows. */
  decorations: DecorationLayer[];
  /** One-based full-array row number for each visible row, or `undefined` when nothing is hidden. */
  rowNumbers: readonly number[] | undefined;
}

/**
 * Hold the closed fold keys for `rows` and project the rows, decorations and
 * gutter numbers onto what stays visible. `ranges` and `decorations` use
 * full-array row indices. With no closed fold, `rows` and `decorations` pass
 * through unchanged.
 */
export const useFoldState = function useFoldState<T>(
  rows: readonly T[],
  ranges: readonly FoldRange[],
  decorations: DecorationLayer[]
): FoldState<T> {
  const [closedKeys, setClosedKeys] = useState<ReadonlySet<Key>>(EMPTY_KEYS);

  const view = useMemo(
    () => computeFoldView(rows.length, ranges, closedKeys),
    [rows.length, ranges, closedKeys]
  );

  const folded = view.visibleToSource.length < rows.length;

  const visibleRows = useMemo(
    () =>
      folded
        ? view.visibleToSource.flatMap((index) => {
            const row = rows[index];

            return row === undefined ? [] : [row];
          })
        : rows,
    [folded, rows, view]
  );

  const visibleDecorations = useMemo(
    () => (folded ? projectDecorationLayers(decorations, view) : decorations),
    [folded, decorations, view]
  );

  const rowNumbers = useMemo(
    () => (folded ? view.visibleToSource.map((index) => index + 1) : undefined),
    [folded, view]
  );

  return {
    closedKeys,
    decorations: visibleDecorations,
    ranges,
    rowCount: rows.length,
    rowNumbers,
    rows: visibleRows,
    setClosedKeys,
    view,
  };
};

/** Fold operations. Row arguments are full-array row indices. */
export interface FoldActions {
  /** Toggle the innermost fold that contains `row`. Returns false when no fold contains it. */
  toggle: (row: number) => boolean;
  /** Close the innermost open fold that contains `row`. Returns false when there is none. */
  close: (row: number) => boolean;
  /** Open the innermost closed fold that contains `row`. Returns false when there is none. */
  open: (row: number) => boolean;
  /** Open a fold at `row` when one is closed, else close the innermost open fold. */
  toggleBlock: (row: number) => boolean;
  closeAll: () => void;
  openAll: () => void;
}

/**
 * Fold operations over a fold state. Any change that hides the document
 * cursor row first moves the cursor to the header of the outermost closed
 * fold that hides it, and key preservation keeps it there. This holds for
 * every target row, so a fold closed from the outline also keeps the cursor
 * visible.
 */
export const useFoldActions = function useFoldActions<T>(
  folds: FoldState<T>,
  navigation: Pick<NavigationState, "cursor" | "setCursor">
): FoldActions {
  const { closedKeys, ranges, rowCount, setClosedKeys, view } = folds;
  const { cursor, setCursor } = navigation;
  const cursorRow = cursor === null ? undefined : view.visibleToSource[cursor];

  const apply = (next: ReadonlySet<Key>) => {
    if (cursorRow !== undefined) {
      const anchor = visibleAnchorRow(computeFoldView(rowCount, ranges, next), cursorRow);
      const anchorIndex = view.sourceToVisible[anchor] ?? -1;

      if (anchor !== cursorRow && anchorIndex !== -1) {
        setCursor(anchorIndex);
      }
    }

    setClosedKeys(next);
  };

  const withKey = (key: Key | undefined, closed: boolean): boolean => {
    if (key === undefined) {
      return false;
    }

    const next = new Set(closedKeys);

    if (closed) {
      next.add(key);
    } else {
      next.delete(key);
    }

    apply(next);

    return true;
  };

  const close = (row: number) =>
    withKey(foldsAt(ranges, row).find((range) => !closedKeys.has(range.key))?.key, true);

  const open = (row: number) =>
    withKey(foldsAt(ranges, row).find((range) => closedKeys.has(range.key))?.key, false);

  return {
    close,
    closeAll: () => {
      apply(new Set(ranges.map((range) => range.key)));
    },
    open,
    openAll: () => {
      apply(EMPTY_KEYS);
    },
    toggle: (row) => {
      const [innermost] = foldsAt(ranges, row);

      return withKey(innermost?.key, innermost !== undefined && !closedKeys.has(innermost.key));
    },
    toggleBlock: (row) =>
      foldsAt(ranges, row).some((range) => closedKeys.has(range.key)) ? open(row) : close(row),
  };
};

/**
 * The Vim fold commands (`z a`, `z c`, `z o`, `z z`, `z shift+m`,
 * `z shift+r`) as action definitions. The row commands act on `targetRow()`:
 * the document cursor row on the root surface, or the selected heading in the
 * outline. `idPrefix` keeps the ids apart on each surface, and `noFoldMessage`
 * is the warning when no fold contains the target row.
 */
export const foldActionDefinitions = function foldActionDefinitions(
  actions: FoldActions,
  targetRow: () => number | undefined,
  idPrefix: string,
  noFoldMessage: string
): ActionDefinition[] {
  const atTarget =
    (run: (row: number) => boolean) =>
    (ctx: CommandContext): void => {
      const row = targetRow();

      if (row === undefined || !run(row)) {
        ctx.toast?.toast({ level: "warning", message: noFoldMessage });
      }
    };

  const definitions: [hotkey: string, id: string, title: string, handler: CommandHandler][] = [
    ["z a", "toggle", "Toggle fold", atTarget(actions.toggle)],
    ["z c", "close", "Close fold", atTarget(actions.close)],
    ["z o", "open", "Open fold", atTarget(actions.open)],
    ["z z", "toggle-block", "Open or close fold", atTarget(actions.toggleBlock)],
    ["z shift+m", "close-all", "Close all folds", actions.closeAll],
    ["z shift+r", "open-all", "Open all folds", actions.openAll],
  ];

  return definitions.map(([hotkey, id, title, handler]) => ({
    category: "Fold",
    handler,
    hotkey,
    id: `${idPrefix}.${id}`,
    modes: ["cursor"],
    title,
  }));
};

/** Register the fold commands on the current surface, acting on the document cursor row. */
export const useFoldCommands = function useFoldCommands<T>(
  folds: FoldState<T>,
  actions: FoldActions,
  navigation: Pick<NavigationState, "cursor">
): void {
  const { cursor } = navigation;
  const cursorRow = cursor === null ? undefined : folds.view.visibleToSource[cursor];
  useCommandGroup({ id: "fold", prefix: "z", title: "Fold" });
  useActions(foldActionDefinitions(actions, () => cursorRow, "fold", "No fold at cursor"));
};
