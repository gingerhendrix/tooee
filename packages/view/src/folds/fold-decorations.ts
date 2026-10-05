import type { DecorationLayer, RowDecoration } from "@tooee/renderers";

import type { FoldView } from "./fold-model.js";

/**
 * Map decoration layers written against full-array rows onto the visible rows
 * of `view`. Decorations on rows that a closed fold hides are dropped.
 */
export const projectDecorationLayers = function projectDecorationLayers(
  layers: readonly DecorationLayer[],
  view: FoldView
): DecorationLayer[] {
  const { visibleToSource, sourceToVisible } = view;
  return layers.map((layer): DecorationLayer => ({
    *forVisibleRows(from: number, to: number): Generator<RowDecoration> {
      const sourceFrom = visibleToSource[from];
      const sourceTo = visibleToSource[Math.min(to, visibleToSource.length - 1)];
      if (sourceFrom === undefined || sourceTo === undefined) {
        return;
      }
      for (const decoration of layer.forVisibleRows(sourceFrom, sourceTo)) {
        const row = sourceToVisible[decoration.row] ?? -1;
        if (row !== -1) {
          yield { ...decoration, row };
        }
      }
    },
    priority: layer.priority,
  }));
};
