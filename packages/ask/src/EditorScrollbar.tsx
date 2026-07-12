import type { TextareaRenderable, InputRenderable } from "@opentui/core";

export interface EditorScrollbarProps {
  /** The editor whose viewport this scrollbar reflects. */
  target: TextareaRenderable | InputRenderable | null;
  /**
   * Bump this whenever the editor viewport may have changed (cursor move,
   * content change, wheel scroll) so the thumb position re-computes.
   */
  revision: number;
  color: string;
}

const THUMB_CHAR = "█";
const TRACK_CHAR = "░";

/**
 * A one-column vertical scrollbar that mirrors an editor's internal viewport.
 *
 * The `<textarea>`/`<input>` (EditBufferRenderable) scrolls its own viewport to
 * follow the cursor and to respond to the mouse wheel, but has no built-in
 * scrollbar, so overflowing content is reachable yet not visibly indicated.
 * This renders a thumb reflecting `offsetY / totalLines` so the user can see
 * there is more content above/below the box.
 *
 * Renders nothing when content fits within the viewport (no overflow).
 */
export function EditorScrollbar({ target, color }: EditorScrollbarProps) {
  if (!target) {
    return null;
  }

  // Rendered height of the editor in rows (available post-layout).
  const height = target.height;
  if (height <= 0) {
    return null;
  }

  // Total virtual (wrapped) line count, not the count currently in view.
  const total = target.editorView.getTotalVirtualLineCount();
  // Content fits, so no scrollbar is needed.
  if (total <= height) {
    return null;
  }

  const offsetY = target.scrollY;
  const maxOffset = Math.max(1, total - height);
  const clampedOffset = Math.min(Math.max(offsetY, 0), maxOffset);

  const thumbSize = Math.max(1, Math.round((height / total) * height));
  const maxThumbTop = Math.max(0, height - thumbSize);
  const thumbTop = Math.round((clampedOffset / maxOffset) * maxThumbTop);

  let content = "";
  for (let i = 0; i < height; i++) {
    const isThumb = i >= thumbTop && i < thumbTop + thumbSize;
    content += isThumb ? THUMB_CHAR : TRACK_CHAR;
    if (i < height - 1) {
      content += "\n";
    }
  }

  return <text content={content} fg={color} selectable={false} />;
}
