import type { Key } from "react"
import { useProvideCommandContextKey } from "@tooee/commands"
import type { DocumentController } from "./types.js"

/** The `document` field contributed to the command context (see augmentation below). */
export interface DocumentCommandContext {
  kind?: string
  title?: string
  rowCount: number
  cursor: number | null
  activeKey: Key | null
  activeRow: unknown
  selection: { start: number; end: number } | null
  selectedRows: readonly unknown[]
  toggledIndices: ReadonlySet<number>
  reload?: () => void
  /** Screen-supplied extras. */
  [key: string]: unknown
}

declare module "@tooee/commands" {
  interface CommandContext {
    document?: DocumentCommandContext
  }
}

export interface ProvideDocumentCommandContextOptions {
  kind?: string
  title?: string
  reload?: () => void
  extras?: Record<string, unknown>
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
    reload: options.reload,
  }))
}
