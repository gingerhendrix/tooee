/**
 * Decide whether the terminal can show a diagram as a pixel image.
 *
 * OpenTUI resolves `protocol: "auto"` to kitty or sixel when the terminal
 * reports support, and to `blocks` otherwise (for example inside tmux). A
 * `blocks` image of a diagram is a coarse half-block raster with unreadable
 * labels, so an `auto` request that resolves to `blocks` counts as "no image
 * support". An explicit `blocks` request is the caller's choice and counts as
 * support.
 */

import { resolveImageRenderProtocol } from "@opentui/core";
import type { ImageRenderProtocol, TerminalCapabilities } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { useCallback, useSyncExternalStore } from "react";

export interface ImageSupportSource {
  capabilities: TerminalCapabilities | null;
  resolution: { width: number; height: number } | null;
}

/** True when `requested` gives a usable diagram image on this terminal. */
export const supportsDiagramImages = function supportsDiagramImages(
  requested: ImageRenderProtocol,
  source: ImageSupportSource
): boolean {
  if (requested === "blocks") {
    return true;
  }

  return (
    resolveImageRenderProtocol(requested, source.capabilities, source.resolution !== null) !==
    "blocks"
  );
};

/**
 * Hook form of `supportsDiagramImages`. It re-renders when the terminal
 * reports its capabilities, which can arrive after the first frame.
 */
export const useDiagramImageSupport = function useDiagramImageSupport(
  requested: ImageRenderProtocol
): boolean {
  const renderer = useRenderer();

  const subscribe = useCallback(
    (listener: () => void) => {
      renderer.on("capabilities", listener);
      renderer.on("resize", listener);

      return () => {
        renderer.off("capabilities", listener);
        renderer.off("resize", listener);
      };
    },
    [renderer]
  );

  const getSnapshot = useCallback(
    () => supportsDiagramImages(requested, renderer),
    [renderer, requested]
  );

  return useSyncExternalStore(subscribe, getSnapshot);
};
