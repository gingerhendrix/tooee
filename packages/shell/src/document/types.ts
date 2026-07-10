import type { Key } from "react"
import type { MouseEvent } from "@opentui/core"
import type { CommandContext } from "@tooee/commands"
import type { ContextMenuEntry, DecorationLayer, DocumentBindings } from "@tooee/renderers"
import type { SearchState } from "@tooee/search"
import type { NavigationState } from "../navigation.js"

/** Re-exported so consumers of the controller need not reach into `@tooee/renderers`. */
export type { DocumentBindings }

/**
 * Priorities of the interaction decoration layers the controller generates.
 * External layers (provider signs, diagnostics, user marks) compose with these:
 * a lower priority paints below, a higher one above.
 */
export const DocumentDecorationPriorities = {
  SEARCH_MATCH: 100,
  TOGGLED: 200,
  SELECTION: 300,
  CURRENT_MATCH: 400,
  CURSOR: 500,
} as const

/** Projects a typed row collection onto the identity, text, and selectability a document needs. */
export interface DocumentRowAdapter<T> {
  /** Stable identity; omit only when position really is identity (for example source lines). */
  getKey?: (row: T, index: number) => Key

  /** Semantic plain text used by default search and copy. */
  getText: (row: T, index: number) => string

  /** Headers/separators may render as rows without accepting the cursor. */
  isSelectable?: (row: T, index: number) => boolean
}

export interface DocumentRowEvent<T> {
  row: T
  index: number
  key: Key
  event: MouseEvent
}

export interface DocumentContextMenuEvent<T> extends DocumentRowEvent<T> {
  context: CommandContext
}

export interface DocumentSearchOptions<T> {
  /** Defaults to case-insensitive matching over `adapter.getText`. */
  match?: (query: string, rows: readonly T[]) => readonly number[]
}

export interface UseDocumentControllerOptions<T> {
  rows: readonly T[]
  adapter: DocumentRowAdapter<T>
  multiSelect?: boolean

  /** `false` registers no search commands and produces no search state. */
  search?: false | DocumentSearchOptions<T>

  /** Register the select-mode copy command (default true). */
  copy?: boolean

  /** Provider/user/app layers; interaction layers are added by the controller. */
  decorations?: readonly DecorationLayer[]

  /** Reconcile the cursor (and toggled rows) to their prior keys when `rows` changes. */
  preserveCursorByKey?: boolean

  onRowPress?: (event: DocumentRowEvent<T>) => void
  contextMenu?:
    | false
    | readonly ContextMenuEntry[]
    | ((event: DocumentContextMenuEvent<T>) => readonly ContextMenuEntry[])
}

export interface DocumentController<T> extends DocumentBindings {
  readonly rows: readonly T[]
  readonly navigation: NavigationState
  readonly search: SearchState | null

  readonly activeIndex: number | null
  readonly activeKey: Key | null
  readonly activeRow: T | undefined
  readonly selectedRows: readonly T[]

  /** Toggled rows projected onto the current row order. */
  readonly toggledIndices: ReadonlySet<number>

  getRow(index: number): T | undefined
  getRowKey(index: number): Key
  getRowAtScreenY(screenY: number): { row: T; index: number; key: Key } | null

  /**
   * Move the cursor to a row, the pointer equivalent of a keyboard move. Stands
   * down while a modal overlay is open, so renderers that resolve their own
   * rows can wire it unconditionally.
   */
  selectRow(index: number): void

  /** Bound handler: modal guard, row resolution, selection, then app/menu callback. */
  onMouseDown(event: MouseEvent): void
}
