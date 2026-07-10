import type { MarkSet } from "@tooee/marks"
import type { ActionDefinition } from "@tooee/commands"
import type { DecorationLayer } from "@tooee/renderers"
import type { AnyContent } from "../../types.js"

export interface SubviewProps {
  content: AnyContent
  /**
   * Provider and user mark sets as decoration layers. They compose with the
   * interaction layers (search, selection, cursor) the controller generates.
   */
  decorations: DecorationLayer[]
  providerMarks: MarkSet[]
  userMarks: MarkSet[]
  setMarkSet: (set: MarkSet) => void
  clearMarkNamespace: (namespace: string) => void
  clearAllUserMarks: () => void
  reload: () => void
  streaming: boolean
  actions?: ActionDefinition[]
}
