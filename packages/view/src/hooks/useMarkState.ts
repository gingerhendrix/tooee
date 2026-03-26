import { useMemo } from "react"
import { MarkSetBuilder, createMarkState, MarkPriorities } from "@tooee/marks"
import type { MarkSet, MarkState } from "@tooee/marks"
import type { ModalNavigationState } from "@tooee/shell"
import type { ResolvedTheme } from "@tooee/themes"

export const TABLE_SEARCH_HEADER_OFFSET = 1

export type IndexMapper = (line: number) => number

/** Identity mapper — used by code/text formats */
export const identity: IndexMapper = (line) => line

/** Create a mapper that subtracts an offset (clamped to 0), used by table format */
export function offsetMapper(offset: number): IndexMapper {
  return (line) => Math.max(0, line - offset)
}

/** Create a mapper that finds the block index for a line, used by markdown format */
export function blockMapper(blockLineMap: number[]): IndexMapper {
  return (line) => {
    for (let i = blockLineMap.length - 1; i >= 0; i--) {
      if (blockLineMap[i] <= line) return i
    }
    return 0
  }
}

interface UseMarkStateParams {
  nav: ModalNavigationState
  theme: ResolvedTheme
  mapIndex: IndexMapper
  providerMarks: MarkSet[]
  userMarks: MarkSet[]
}

export function useMarkState({
  nav,
  theme,
  mapIndex,
  providerMarks,
  userMarks,
}: UseMarkStateParams): MarkState | undefined {
  return useMemo(() => {
    const sets: MarkSet[] = []

    // Search matches
    if (nav.matchingLines.length > 0) {
      const mapped = new Set(nav.matchingLines.map(mapIndex))
      const builder = new MarkSetBuilder()
      for (const idx of mapped) {
        builder.addLine(idx, {
          background: theme.warning,
          signBefore: "\u25CF",
          foreground: theme.warning,
        })
      }
      sets.push(builder.build("search", MarkPriorities.SEARCH_MATCH))
    }

    // Toggled lines
    if (nav.toggledIndices.size > 0) {
      const mapped = new Set(Array.from(nav.toggledIndices).map(mapIndex))
      const builder = new MarkSetBuilder()
      for (const idx of mapped) {
        builder.addLine(idx, { background: theme.backgroundPanel })
      }
      sets.push(builder.build("toggled", MarkPriorities.TOGGLED))
    }

    // Selection range
    if (nav.selection) {
      const builder = new MarkSetBuilder()
      builder.addRange(
        { line: mapIndex(nav.selection.start.line) },
        { line: mapIndex(nav.selection.end.line) },
        { background: theme.selection },
      )
      sets.push(builder.build("selection", MarkPriorities.SELECTION))
    }

    // Current match highlight
    if (nav.matchingLines.length > 0) {
      const currentLine = nav.matchingLines[nav.currentMatchIndex]
      if (currentLine != null) {
        const builder = new MarkSetBuilder()
        builder.addLine(mapIndex(currentLine), {
          background: theme.primary,
          signBefore: "\u25CF",
          foreground: theme.primary,
        })
        sets.push(builder.build("currentMatch", MarkPriorities.CURRENT_MATCH))
      }
    }

    // Cursor
    if (nav.cursor) {
      const builder = new MarkSetBuilder()
      builder.addLine(mapIndex(nav.cursor.line), {
        background: theme.cursorLine,
        signBefore: "\u25B8",
        foreground: theme.primary,
      })
      sets.push(builder.build("cursor", MarkPriorities.CURSOR))
    }

    // Provider and user marks
    sets.push(...providerMarks, ...userMarks)

    return sets.length > 0 ? createMarkState(sets) : undefined
  }, [
    nav.matchingLines,
    nav.currentMatchIndex,
    nav.toggledIndices,
    nav.selection,
    nav.cursor,
    mapIndex,
    theme,
    providerMarks,
    userMarks,
  ])
}
