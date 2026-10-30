import type { Renderable } from "@opentui/core";
import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export type PanelInsetValue = number | "auto" | `${number}%`;

export interface PanelInset {
  left?: PanelInsetValue;
  right?: PanelInsetValue;
  top?: PanelInsetValue;
  bottom?: PanelInsetValue;
}

export interface ResolvedPanelInset {
  left: PanelInsetValue;
  right: PanelInsetValue;
  top: PanelInsetValue;
  bottom: PanelInsetValue;
}

export interface PanelContainerSize {
  width: number;
  height: number;
}

export const DEFAULT_PANEL_INSET = "20%";

const PERCENT_PATTERN = /^(?<percent>-?\d+(?:\.\d+)?)%$/u;

const resolveEdge = function resolveEdge(
  value: PanelInsetValue | undefined,
  extent: number | undefined
): PanelInsetValue {
  const edge = value ?? DEFAULT_PANEL_INSET;
  const percent = PERCENT_PATTERN.exec(String(edge))?.groups?.percent;

  if (percent === undefined || extent === undefined) {
    return edge;
  }

  return Math.round((Number(percent) / 100) * extent);
};

/**
 * Resolve percentage insets to whole terminal cells.
 *
 * Percent insets give the panel fractional geometry. OpenTUI 0.6 rounds each
 * child's position inside that fractional box on its own, so the last rows can
 * land on the bottom border and editors can paint below it. Whole-cell insets
 * keep every row of the panel on the grid. Without a container size the
 * percentages pass through unchanged.
 */
export const resolvePanelInset = function resolvePanelInset(
  inset: PanelInset | undefined,
  container?: PanelContainerSize
): ResolvedPanelInset {
  return {
    bottom: resolveEdge(inset?.bottom, container?.height),
    left: resolveEdge(inset?.left, container?.width),
    right: resolveEdge(inset?.right, container?.width),
    top: resolveEdge(inset?.top, container?.height),
  };
};

const readSize = function readSize(node: Renderable): PanelContainerSize | undefined {
  return node.width > 0 && node.height > 0 ? { height: node.height, width: node.width } : undefined;
};

/**
 * Track the size of the renderable that contains `ref`. The size is read in a
 * layout effect, so a container that already has layout gives whole-cell
 * insets on the first painted frame, and it updates on every container resize.
 */
export const useContainerSize = function useContainerSize(
  ref: RefObject<Renderable | null>
): PanelContainerSize | undefined {
  const [size, setSize] = useState<PanelContainerSize>();

  useLayoutEffect(() => {
    const parent = ref.current?.parent;

    if (!parent) {
      return () => {
        // Without a parent there is no resize listener to remove.
      };
    }

    const sync = () => {
      const next = readSize(parent);

      setSize((prev) =>
        prev?.width === next?.width && prev?.height === next?.height ? prev : next
      );
    };

    sync();
    parent.on("resize", sync);

    return () => {
      parent.off("resize", sync);
    };
  }, [ref]);

  return size;
};
