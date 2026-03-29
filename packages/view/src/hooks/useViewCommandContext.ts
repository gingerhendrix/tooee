import { useProvideCommandContext } from "@tooee/commands"
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
  useProvideCommandContext(() => ({
    view: {
      content,
      format: content.format,
      cursor: nav.cursor,
      selection: nav.selection,
      mode: nav.mode,
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
