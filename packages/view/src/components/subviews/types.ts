import type { MarkSet } from "@tooee/marks"
import type { ActionDefinition } from "@tooee/commands"
import type { AnyContent } from "../../types.js"

export interface SubviewProps {
  content: AnyContent
  providerMarks: MarkSet[]
  userMarks: MarkSet[]
  setMarkSet: (set: MarkSet) => void
  clearMarkNamespace: (namespace: string) => void
  clearAllUserMarks: () => void
  reload: () => void
  streaming: boolean
  actions?: ActionDefinition[]
}
