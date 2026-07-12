import type { Key } from "react";
import { useProvideCommandContextKey } from "@tooee/commands";
import type { DocumentRowAnchor } from "@tooee/renderers";
import type { DocumentController } from "./types.js";

/** The `document` field contributed to the command context (see augmentation below). */
export interface DocumentCommandContext {
  kind?: string;
  title?: string;
  rowCount: number;
  cursor: number | null;
  activeKey: Key | null;
  activeRow: unknown;
  selection: { start: number; end: number } | null;
  selectedRows: readonly unknown[];
  toggledIndices: ReadonlySet<number>;

  /**
   * The active/selected rows as source anchors — the common path for comment,
   * quote, and jump-to-source actions is `ctx.document?.activeAnchor`. Bounded
   * to active/selected rows; the typed controller owns all-row lookups.
   */
  activeAnchor: DocumentRowAnchor<unknown> | null;
  selectedAnchors: readonly DocumentRowAnchor<unknown>[];

  reload?: () => void;
  /** Screen-supplied extras. */
  [key: string]: unknown;
}

declare module "@tooee/commands" {
  interface CommandContext {
    document?: DocumentCommandContext;
  }
}

export interface ProvideDocumentCommandContextOptions {
  kind?: string;
  title?: string;
  reload?: () => void;
  extras?: Record<string, unknown>;
}

/**
 * Publishes the controller's live row state as `ctx.document`. Every row
 * document gets active/selected rows; content-specific fields belong on the
 * owning package's own context key.
 */
export function useProvideDocumentCommandContext<T>(
  controller: DocumentController<T>,
  options: ProvideDocumentCommandContextOptions = {},
): void {
  useProvideCommandContextKey("document", () => ({
    ...options.extras,
    kind: options.kind,
    title: options.title,
    rowCount: controller.rows.length,
    cursor: controller.activeIndex,
    activeKey: controller.activeKey,
    activeRow: controller.activeRow,
    selection: controller.navigation.selection,
    selectedRows: controller.selectedRows,
    toggledIndices: controller.toggledIndices,
    activeAnchor: controller.activeAnchor,
    selectedAnchors: controller.selectedAnchors,
    reload: options.reload,
  }));
}
