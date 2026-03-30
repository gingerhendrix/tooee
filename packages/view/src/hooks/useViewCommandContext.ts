import { useProvideCommandContext, useMode } from "@tooee/commands"
import type { NavigationState } from "@tooee/shell"
import type { MarkSet } from "@tooee/marks"
import type { AnyContent } from "../types.js"

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
