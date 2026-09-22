import type { ExtendedComponentProps } from "@opentui/react";
import type { RowDocumentRenderable } from "@tooee/renderers";
import type { ReactNode } from "react";
import "@tooee/renderers/row-document";

import type { DocumentController } from "./types.js";

export type RowDocumentProps = ExtendedComponentProps<typeof RowDocumentRenderable>;

export interface DocumentProps<T> extends Omit<
  RowDocumentProps,
  "ref" | "decorations" | "onMouseDown" | "children"
> {
  controller: DocumentController<T>;
  /** Must render exactly one host element per row; it becomes the row's geometry. */
  renderRow: (row: T, index: number) => ReactNode;
}

/**
 * The bound multi-child `row-document`: one direct host child per model row,
 * with the controller's ref, decorations, and mouse handler wired in. Callers
 * cannot remember navigation but forget scroll-follow or mouse binding.
 */
export const Document = function Document<T>({
  controller,
  renderRow,
  ...rowDocumentProps
}: DocumentProps<T>): ReactNode {
  const handleMouseDown = controller.onMouseDown;
  // Tail follow pins the viewport with the scroll box's own sticky scroll. It
  // re-pins during layout, before paint, so streamed rows never flash.
  const stickyProps = controller.followTail
    ? { stickyScroll: true, stickyStart: "bottom" as const }
    : {};

  return (
    <row-document
      {...rowDocumentProps}
      {...stickyProps}
      ref={controller.ref}
      decorations={controller.decorations}
      onMouseDown={handleMouseDown}
    >
      {controller.rows.map((row, index): ReactNode => (
        <box key={controller.getRowKey(index)}>{renderRow(row, index)}</box>
      ))}
    </row-document>
  );
};
