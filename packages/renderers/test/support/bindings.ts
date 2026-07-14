import { useRef } from "react";
import type { MouseEvent } from "@opentui/core";
import type { DecorationLayer } from "../../src/decoration-layer.js";
import type { DocumentBindings } from "../../src/document-bindings.js";
import type { RowDocumentRenderable } from "../../src/row-document-renderable.js";

const NO_DECORATIONS: readonly DecorationLayer[] = [];

/** Paint-only bindings: decoration layers with no ref sharing or mouse handling. */
export const decorationBindings = function decorationBindings(
  decorations: readonly DecorationLayer[],
): DocumentBindings {
  return {
    decorations,
    onMouseDown() {
      // Paint-only: these bindings deliberately ignore mouse input.
    },
    ref: { current: null },
  };
};

export interface RowMouseCallbacks {
  onRowClick?: (index: number) => void;
  onRowContextMenu?: (index: number, x: number, y: number) => void;
}

/**
 * Stands in for `useDocumentController`'s mouse mapping so renderer tests can
 * assert screen-Y → row geometry without pulling in `@tooee/shell`.
 */
export const useRowMouseBindings = function useRowMouseBindings({
  onRowClick,
  onRowContextMenu,
}: RowMouseCallbacks): DocumentBindings {
  const ref = useRef<RowDocumentRenderable | null>(null);

  return {
    decorations: NO_DECORATIONS,
    onMouseDown(event: MouseEvent) {
      const row = ref.current?.getRowAtScreenY(event.y);
      if (row === null || row === undefined) {
        return;
      }
      if (event.button === 0) {
        onRowClick?.(row);
      } else if (event.button === 2) {
        event.preventDefault();
        onRowContextMenu?.(row, event.x, event.y);
      }
    },
    ref,
  };
};
