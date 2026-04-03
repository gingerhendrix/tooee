import { useMemo } from "react"
import { MarkSetBuilder, createMarkState, MarkPriorities } from "@tooee/marks"
import type { MarkSet, MarkState } from "@tooee/marks"
import type { NavigationState } from "@tooee/shell"
import type { SearchState } from "@tooee/search"
import type { ResolvedTheme } from "@tooee/themes"

interface UseMarkStateParams {
  nav: Pick<NavigationState, "cursor" | "selection" | "toggledIndices">
  search: Pick<SearchState, "matchingLines" | "currentMatchIndex">
  theme: ResolvedTheme
  providerMarks: MarkSet[]
  userMarks: MarkSet[]
}

export function useMarkState({
  nav,
  search,
  theme,
  providerMarks,
  userMarks,
}: UseMarkStateParams): MarkState | undefined {
  return useMemo(() => {
    const sets: MarkSet[] = []

    // Search matches
    if (search.matchingLines.length > 0) {
      const mapped = new Set(search.matchingLines)
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
      const mapped = new Set(nav.toggledIndices)
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
        { line: nav.selection.start },
        { line: nav.selection.end },
        { background: theme.selection },
      )
      sets.push(builder.build("selection", MarkPriorities.SELECTION))
    }

    // Current match highlight
    if (search.matchingLines.length > 0) {
      const currentLine = search.matchingLines[search.currentMatchIndex]
      if (currentLine != null) {
        const builder = new MarkSetBuilder()
        builder.addLine(currentLine, {
          background: theme.primary,
          signBefore: "\u25CF",
          foreground: theme.primary,
        })
        sets.push(builder.build("currentMatch", MarkPriorities.CURRENT_MATCH))
      }
    }

    // Cursor
    if (nav.cursor !== null) {
      const builder = new MarkSetBuilder()
      builder.addLine(nav.cursor, {
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
    search.matchingLines,
    search.currentMatchIndex,
    nav.toggledIndices,
    nav.selection,
    nav.cursor,
    theme,
    providerMarks,
    userMarks,
  ])
}
