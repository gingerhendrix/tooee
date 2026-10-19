import type {
  TextareaRenderable,
  InputRenderable,
  TextRenderable,
  BoxRenderable,
} from "@opentui/core";
import { useCallback, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface EditorScrollbarProps {
  /** The editor whose viewport this scrollbar reflects. */
  target: { current: TextareaRenderable | InputRenderable | null };
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
const scrollbarContent = function scrollbarContent(
  target: TextareaRenderable | InputRenderable
): string {
  const { height } = target;
  const total = target.editorView.getTotalVirtualLineCount();

  if (height <= 0 || total <= height) {
    return "";
  }

  const maxOffset = Math.max(1, total - height);
  const clampedOffset = Math.min(Math.max(target.scrollY, 0), maxOffset);
  const thumbSize = Math.max(1, Math.round((height / total) * height));
  const maxThumbTop = Math.max(0, height - thumbSize);
  const thumbTop = Math.round((clampedOffset / maxOffset) * maxThumbTop);

  return Array.from({ length: height }, (_, i) =>
    i >= thumbTop && i < thumbTop + thumbSize ? THUMB_CHAR : TRACK_CHAR
  ).join("\n");
};

export const EditorScrollbar = function EditorScrollbar({
  target,
  revision,
  color,
}: EditorScrollbarProps): ReactNode {
  const bar = useRef<TextRenderable>(null);
  const track = useRef<BoxRenderable>(null);

  const sync = useCallback(() => {
    if (!target.current || !bar.current || !track.current) {
      return;
    }

    const content = scrollbarContent(target.current);
    bar.current.content = content;
    track.current.width = content === "" ? 0 : 1;
  }, [target]);

  useLayoutEffect(() => {
    // Resize hooks run before paint and can participate in the current
    // layout. Reading height in React render sees the previous frame on 0.6.
    sync();
  }, [sync, revision]);

  return (
    <box ref={track} width={0} height="100%" onSizeChange={sync} flexShrink={0}>
      <text ref={bar} fg={color} selectable={false} />
    </box>
  );
};
