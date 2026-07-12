import { useCallback } from "react";
import type { MouseEvent } from "@opentui/core";
import { useTheme } from "./context.js";

interface CloseButtonProps {
  /** Called when the button is clicked (left mouse button). */
  onClose: () => void;
  /** Glyph to render (default "✕"). */
  glyph?: string;
  /** Foreground colour (defaults to theme.textMuted). */
  color?: string;
}

/**
 * Reusable clickable close control for overlays.
 *
 * Renders a small themed glyph that calls `onClose` on left-click. Purely
 * additive — overlays keep their existing Escape / cancel keyboard paths.
 */
export const CloseButton = function CloseButton({ onClose, glyph = "✕", color }: CloseButtonProps) {
  const { theme } = useTheme();

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      // Left button only; let other buttons bubble.
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose();
    },
    [onClose],
  );

  return (
    <box flexShrink={0} paddingLeft={1} onMouseDown={handleMouseDown}>
      <text content={glyph} fg={color ?? theme.textMuted} />
    </box>
  );
};
