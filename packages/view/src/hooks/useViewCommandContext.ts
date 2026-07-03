import { useProvideCommandContext, useMode } from "@tooee/commands"
import type { Mode } from "@tooee/commands"
import type { NavigationState } from "@tooee/shell"
import type { MarkSet } from "@tooee/marks"
import type { AnyContent } from "../types.js"

/** The `view` field contributed to the command context (see augmentation below). */
export interface ViewCommandContext {
  content: AnyContent
  format: string
  cursor: number | null
  selection: { start: number; end: number } | null
  mode: Mode
  toggledIndices: Set<number>
  reload: () => void
  marks: {
    setMarkSet: (set: MarkSet) => void
    clearNamespace: (namespace: string) => void
    clearAll: () => void
    userMarks: MarkSet[]
    providerMarks: MarkSet[]
  }
  /** Subview extras (e.g. activeRow/selectedRows for tables). */
  [key: string]: unknown
}

declare module "@tooee/commands" {
  interface CommandContext {
    view: ViewCommandContext
  }
}

interface UseViewCommandContextParams {
  content: AnyContent
  nav: NavigationState
  reload: () => void
  providerMarks: MarkSet[]
  userMarks: MarkSet[]
  setMarkSet: (set: MarkSet) => void
  clearMarkNamespace: (namespace: string) => void
  clearAllUserMarks: () => void
  /** Extra fields merged into the view context (e.g. activeRow, selectedRows for table) */
  extras?: Record<string, unknown>
}

export function useViewCommandContext({
  content,
  nav,
  reload,
  providerMarks,
  userMarks,
  setMarkSet,
  clearMarkNamespace,
  clearAllUserMarks,
  extras,
}: UseViewCommandContextParams) {
  const mode = useMode()
  useProvideCommandContext(() => ({
    view: {
      content,
      format: content.format,
      cursor: nav.cursor,
      selection: nav.selection,
      mode,
      toggledIndices: nav.toggledIndices,
      reload,
      marks: {
        setMarkSet,
        clearNamespace: clearMarkNamespace,
        clearAll: clearAllUserMarks,
        userMarks,
        providerMarks,
      },
      ...extras,
    },
  }))
}
