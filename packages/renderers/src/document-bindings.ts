import type { RefObject } from "react";
import type { MouseEvent } from "@opentui/core";
import type { DecorationLayer } from "./decoration-layer.js";
import type { RowDocumentRenderable } from "./row-document-renderable.js";

/**
 * The narrow projection a row renderer needs from a document controller:
 * geometry access, the layers to paint, and the bound mouse handler. Renderers
 * never see the controller's row type — this type lives here so a renderer can
 * accept bindings without depending on `@tooee/shell`.
 */
export interface DocumentBindings {
  ref: RefObject<RowDocumentRenderable | null>;
  decorations: readonly DecorationLayer[];
  onMouseDown: (event: MouseEvent) => void;
}
