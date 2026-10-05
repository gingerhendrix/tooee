import { useCommand, useCommandGroup } from "@tooee/commands";
import type { CommandContext } from "@tooee/commands";
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

const warnNoFold = function warnNoFold(ctx: CommandContext): void {
  ctx.toast?.toast({ level: "warning", message: "No fold at cursor" });
};

/**
 * Register the Vim fold commands (`z a`, `z c`, `z o`, `z shift+m`,
 * `z shift+r`) against a fold state and the controller's navigation. When a
 * close hides the cursor row, the cursor moves first to the header of the
 * outermost closed fold, and key preservation keeps it there.
 */
export const useFoldCommands = function useFoldCommands<T>(
  folds: FoldState<T>,
  navigation: Pick<NavigationState, "cursor" | "setCursor">
): void {
  const { closedKeys, ranges, rowCount, setClosedKeys, view } = folds;
  const { cursor, setCursor } = navigation;
  const sourceRow = cursor === null ? undefined : view.visibleToSource[cursor];
  const atCursor = sourceRow === undefined ? [] : foldsAt(ranges, sourceRow);

  const apply = (next: ReadonlySet<Key>) => {
    if (sourceRow !== undefined) {
      const anchor = visibleAnchorRow(computeFoldView(rowCount, ranges, next), sourceRow);
      const anchorIndex = view.sourceToVisible[anchor] ?? -1;
      if (anchor !== sourceRow && anchorIndex !== -1) {
        setCursor(anchorIndex);
      }
    }
    setClosedKeys(next);
  };
  const withKey = (key: Key, closed: boolean) => {
    const next = new Set(closedKeys);
    if (closed) {
      next.add(key);
    } else {
      next.delete(key);
    }
    apply(next);
  };

  useCommandGroup({ id: "fold", prefix: "z", title: "Fold" });

  useCommand({
    category: "Fold",
    handler: (ctx) => {
      const [innermost] = atCursor;
      if (innermost === undefined) {
        warnNoFold(ctx);
        return;
      }
      withKey(innermost.key, !closedKeys.has(innermost.key));
    },
    hotkey: "z a",
    id: "fold.toggle",
    modes: ["cursor"],
    title: "Toggle fold",
  });

  useCommand({
    category: "Fold",
    handler: (ctx) => {
      const target = atCursor.find((range) => !closedKeys.has(range.key));
      if (target === undefined) {
        warnNoFold(ctx);
        return;
      }
      withKey(target.key, true);
    },
    hotkey: "z c",
    id: "fold.close",
    modes: ["cursor"],
    title: "Close fold",
  });

  useCommand({
    category: "Fold",
    handler: (ctx) => {
      const target = atCursor.find((range) => closedKeys.has(range.key));
      if (target === undefined) {
        warnNoFold(ctx);
        return;
      }
      withKey(target.key, false);
    },
    hotkey: "z o",
    id: "fold.open",
    modes: ["cursor"],
    title: "Open fold",
  });

  useCommand({
    category: "Fold",
    handler: () => {
      apply(new Set(ranges.map((range) => range.key)));
    },
    hotkey: "z shift+m",
    id: "fold.close-all",
    modes: ["cursor"],
    title: "Close all folds",
  });

  useCommand({
    category: "Fold",
    handler: () => {
      apply(EMPTY_KEYS);
    },
    hotkey: "z shift+r",
    id: "fold.open-all",
    modes: ["cursor"],
    title: "Open all folds",
  });
};
