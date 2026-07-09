import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { Key } from "react"
import type { MouseEvent } from "@opentui/core"
import { useBuildCommandContext, useCommand, useCommandContext } from "@tooee/commands"
import type { Mode } from "@tooee/commands"
import { useHasModalOverlay } from "@tooee/overlays"
import type { ContextMenuEntry, DecorationLayer, RowDocumentRenderable } from "@tooee/renderers"
import { useSearch } from "@tooee/search"
import { useTheme } from "@tooee/themes"
import { useContextMenu } from "../context-menu.js"
import { useCopy } from "../copy-hook.js"
import { useNavigation } from "../navigation.js"
import { buildInteractionDecorations } from "./decorations.js"
import type {
  DocumentController,
  DocumentRowAdapter,
  UseDocumentControllerOptions,
} from "./types.js"

const EMPTY_LAYERS: readonly DecorationLayer[] = []
const EMPTY_INDICES = new Set<number>()
const EMPTY_MATCHES: readonly number[] = []
const EMPTY_ROWS: readonly never[] = []

const CURSOR_MODES: Mode[] = ["cursor"]
const SELECT_MODES: Mode[] = ["select"]

function rowKey<T>(adapter: DocumentRowAdapter<T>, row: T | undefined, index: number): Key {
  return adapter.getKey && row !== undefined ? adapter.getKey(row, index) : index
}

function defaultMatch<T>(
  query: string,
  rows: readonly T[],
  getText: (row: T, index: number) => string,
): number[] {
  const lowered = query.toLowerCase()
  const matches: number[] = []
  for (let index = 0; index < rows.length; index++) {
    if (getText(rows[index]!, index).toLowerCase().includes(lowered)) {
      matches.push(index)
    }
  }
  return matches
}

/**
 * The headless row model and interaction controller behind a row document:
 * identity, navigation, selection, search, copy, decorations, scroll-follow,
 * and mouse. The typed row collection is the single source of truth — row
 * count, rendered children, search results, copy text, and the active row all
 * derive from it, so they cannot drift apart.
 */
export function useDocumentController<T>(
  options: UseDocumentControllerOptions<T>,
): DocumentController<T> {
  const {
    rows,
    adapter,
    multiSelect = false,
    search: searchOptions,
    copy = true,
    decorations: externalDecorations = EMPTY_LAYERS,
    preserveCursorByKey = false,
    onRowPress,
    contextMenu: contextMenuOptions,
  } = options

  const { theme } = useTheme()
  const ref = useRef<RowDocumentRenderable | null>(null)

  // Callers pass fresh object/closure literals every render; read them through
  // refs so command registrations and bound handlers stay stable.
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const adapterRef = useRef(adapter)
  adapterRef.current = adapter
  const onRowPressRef = useRef(onRowPress)
  onRowPressRef.current = onRowPress
  const contextMenuOptionsRef = useRef(contextMenuOptions)
  contextMenuOptionsRef.current = contextMenuOptions

  const getRow = useCallback((index: number): T | undefined => rowsRef.current[index], [])

  const getRowKey = useCallback(
    (index: number): Key => rowKey(adapterRef.current, rowsRef.current[index], index),
    [],
  )

  const getRowText = useCallback((index: number): string => {
    const row = rowsRef.current[index]
    return row === undefined ? "" : adapterRef.current.getText(row, index)
  }, [])

  // Closes over `rows` rather than the ref so navigation's index resolver is
  // invalidated when the collection (and therefore selectability) changes.
  const isSelectable = useMemo(
    () =>
      (index: number): boolean => {
        const row = rows[index]
        if (row === undefined) return false
        return adapterRef.current.isSelectable?.(row, index) ?? true
      },
    [rows],
  )

  // Toggled rows are owned here rather than by useNavigation so they can be
  // key-backed: a sort or filter must not move the selection onto other rows.
  const navigation = useNavigation({ rowCount: rows.length, isSelectable, multiSelect: false })
  const setCursor = navigation.setCursor
  const cursorRef = useRef(navigation.cursor)
  cursorRef.current = navigation.cursor

  const [toggledKeys, setToggledKeys] = useState<ReadonlySet<Key>>(() => new Set<Key>())

  const toggledIndices = useMemo<Set<number>>(() => {
    if (toggledKeys.size === 0) return EMPTY_INDICES
    const indices = new Set<number>()
    for (let index = 0; index < rows.length; index++) {
      if (toggledKeys.has(rowKey(adapterRef.current, rows[index], index))) indices.add(index)
    }
    return indices
  }, [toggledKeys, rows])

  const toggleAt = useCallback(
    (index: number) => {
      const key = getRowKey(index)
      setToggledKeys((previous) => {
        const next = new Set(previous)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      })
    },
    [getRowKey],
  )

  const toggleCursor = useCallback(() => {
    if (cursorRef.current !== null) toggleAt(cursorRef.current)
  }, [toggleAt])

  useCommand({
    id: "cursor-toggle",
    title: "Toggle selection",
    hotkey: "tab",
    modes: CURSOR_MODES,
    enabled: multiSelect,
    handler: toggleCursor,
  })
  useCommand({
    id: "cursor-toggle-up",
    title: "Toggle and move up",
    hotkey: "shift+tab",
    modes: CURSOR_MODES,
    enabled: multiSelect,
    handler: () => {
      const cursor = cursorRef.current
      if (cursor === null) return
      toggleAt(cursor)
      setCursor(cursor - 1)
    },
  })
  useCommand({
    id: "select-toggle",
    title: "Toggle selection",
    hotkey: "tab",
    modes: SELECT_MODES,
    enabled: multiSelect,
    handler: toggleCursor,
  })

  // -- Search ---------------------------------------------------------------

  const searchEnabled = searchOptions !== false
  const matchRef = useRef(searchOptions === false ? undefined : searchOptions?.match)
  matchRef.current = searchOptions === false ? undefined : searchOptions?.match

  const match = useCallback((query: string): number[] => {
    const currentRows = rowsRef.current
    const custom = matchRef.current
    if (custom) return [...custom(query, currentRows)]
    return defaultMatch(query, currentRows, (row, index) => adapterRef.current.getText(row, index))
  }, [])

  const searchDeps = useMemo(() => [rows], [rows])
  const searchState = useSearch({
    match,
    onJump: setCursor,
    enabled: searchEnabled,
    deps: searchDeps,
  })
  const search = searchEnabled ? searchState : null

  // -- Copy -----------------------------------------------------------------

  useCopy({
    getRowText,
    cursor: navigation.cursor,
    selection: navigation.selection,
    toggledIndices,
    enabled: copy,
  })

  // -- Derived rows ---------------------------------------------------------

  const activeIndex =
    navigation.cursor !== null && navigation.cursor < rows.length ? navigation.cursor : null
  const activeRow = activeIndex !== null ? rows[activeIndex] : undefined
  const activeKey = activeIndex !== null ? rowKey(adapter, activeRow, activeIndex) : null

  const selectedRows = useMemo<readonly T[]>(() => {
    if (toggledIndices.size > 0) {
      return Array.from(toggledIndices)
        .sort((left, right) => left - right)
        .map((index) => rows[index]!)
    }
    if (navigation.selection) {
      return rows.slice(navigation.selection.start, navigation.selection.end + 1)
    }
    return EMPTY_ROWS
  }, [toggledIndices, navigation.selection, rows])

  // -- Stable-key cursor reconciliation --------------------------------------

  const previousRowsRef = useRef(rows)
  const previousActiveKeyRef = useRef<Key | null>(activeKey)
  const previousActiveIndexRef = useRef<number | null>(activeIndex)

  useEffect(() => {
    if (previousRowsRef.current === rows) return
    previousRowsRef.current = rows

    const getKey = adapterRef.current.getKey
    if (!preserveCursorByKey || !getKey || rows.length === 0) return

    const previousKey = previousActiveKeyRef.current
    const previousIndex = previousActiveIndexRef.current
    if (previousKey === null || previousIndex === null) return

    for (let index = 0; index < rows.length; index++) {
      if (getKey(rows[index]!, index) === previousKey) {
        if (index !== cursorRef.current) setCursor(index)
        return
      }
    }

    // The active row is gone: clamp to the nearest selectable row at or after
    // the position it used to occupy.
    setCursor(Math.min(previousIndex, rows.length - 1))
  }, [rows, preserveCursorByKey, setCursor])

  // Declared after the reconcile effect so that effect still sees the previous
  // commit's active row.
  useEffect(() => {
    previousActiveKeyRef.current = activeKey
    previousActiveIndexRef.current = activeIndex
  })

  // -- Decorations ----------------------------------------------------------

  const interactionDecorations = useMemo(
    () =>
      buildInteractionDecorations({
        cursor: navigation.cursor,
        selection: navigation.selection,
        toggledIndices,
        matchingLines: search?.matchingLines ?? EMPTY_MATCHES,
        currentMatchIndex: search?.currentMatchIndex ?? 0,
        theme,
      }),
    [
      navigation.cursor,
      navigation.selection,
      toggledIndices,
      search?.matchingLines,
      search?.currentMatchIndex,
      theme,
    ],
  )

  const decorations = useMemo(
    () =>
      externalDecorations.length === 0
        ? interactionDecorations
        : [...interactionDecorations, ...externalDecorations],
    [interactionDecorations, externalDecorations],
  )

  // -- Scroll follow --------------------------------------------------------

  const cursor = navigation.cursor
  useEffect(() => {
    const document = ref.current
    if (!document || cursor === null) return

    if (document.getRowMetrics(cursor)) {
      document.scrollToRow(cursor, "nearest")
      return
    }

    // Geometry is computed during render, so the first cursor effect after a
    // mount or a row change finds no metrics. Follow once it exists.
    const onGeometry = () => {
      document.off("row-geometry-change", onGeometry)
      document.scrollToRow(cursor, "nearest")
    }
    document.on("row-geometry-change", onGeometry)
    return () => {
      document.off("row-geometry-change", onGeometry)
    }
  }, [cursor, rows])

  // -- Mouse ----------------------------------------------------------------

  const hasModalOverlay = useHasModalOverlay()
  const hasModalOverlayRef = useRef(hasModalOverlay)
  hasModalOverlayRef.current = hasModalOverlay

  const contextMenuController = useContextMenu()
  const buildCommandContext = useBuildCommandContext()
  const { invoke } = useCommandContext()
  const invokeRef = useRef(invoke)
  invokeRef.current = invoke

  const getRowAtScreenY = useCallback(
    (screenY: number) => {
      const index = ref.current?.getRowAtScreenY(screenY)
      if (index == null || index < 0 || index >= rowsRef.current.length) return null
      return { row: rowsRef.current[index]!, index, key: getRowKey(index) }
    },
    [getRowKey],
  )

  const openContextMenu = contextMenuController.open
  const onMouseDown = useCallback(
    (event: MouseEvent) => {
      // Row mouse handlers stand down while a modal overlay is up: centered
      // overlays leave clickable margins, and mouse events route through the
      // hit-grid, bypassing command-surface arbitration.
      if (hasModalOverlayRef.current) return

      const hit = getRowAtScreenY(event.y)
      if (!hit) return

      if (event.button === 0) {
        setCursor(hit.index)
        onRowPressRef.current?.({ ...hit, event })
        return
      }

      if (event.button !== 2) return
      const menu = contextMenuOptionsRef.current
      if (!menu) return

      event.preventDefault()
      setCursor(hit.index)

      const entries: readonly ContextMenuEntry[] =
        typeof menu === "function" ? menu({ ...hit, event, context: buildCommandContext() }) : menu
      if (entries.length === 0) return
      openContextMenu(event.x, event.y, [...entries], (id) => invokeRef.current(id))
    },
    [getRowAtScreenY, setCursor, openContextMenu, buildCommandContext],
  )

  return useMemo(
    () => ({
      rows,
      navigation: { ...navigation, toggledIndices },
      search,
      activeIndex,
      activeKey,
      activeRow,
      selectedRows,
      toggledIndices,
      ref,
      decorations,
      getRow,
      getRowKey,
      getRowAtScreenY,
      onMouseDown,
    }),
    [
      rows,
      navigation,
      search,
      activeIndex,
      activeKey,
      activeRow,
      selectedRows,
      toggledIndices,
      decorations,
      getRow,
      getRowKey,
      getRowAtScreenY,
      onMouseDown,
    ],
  )
}
