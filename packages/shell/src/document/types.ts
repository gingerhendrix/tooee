import type { Key, RefObject } from "react"
import type { MouseEvent } from "@opentui/core"
import type { CommandContext } from "@tooee/commands"
import type { ContextMenuEntry, DecorationLayer, RowDocumentRenderable } from "@tooee/renderers"
import type { SearchState } from "@tooee/search"
import type { NavigationState } from "../navigation.js"

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

/** The narrow projection a row renderer needs; renderers never see the row type. */
export interface DocumentBindings {
  ref: RefObject<RowDocumentRenderable | null>
  decorations: readonly DecorationLayer[]
  onMouseDown(event: MouseEvent): void
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

  /** Bound handler: modal guard, row resolution, selection, then app/menu callback. */
  onMouseDown(event: MouseEvent): void
}
