import type { ReactNode } from "react"
import type { ActionDefinition } from "@tooee/commands"
import type { StatusBarItem } from "@tooee/layout"
import type { MarkSet } from "@tooee/marks"
import { DocumentScreen, type DocumentController } from "@tooee/shell"
import { useProvideViewCommandContext } from "../hooks/useViewCommandContext.js"
import type { AnyContent } from "../types.js"

export interface ViewScreenProps<T> {
  content: AnyContent
  controller: DocumentController<T>
  streaming: boolean
  actions?: ActionDefinition[]
  /** Content-shaped status (format, line/row counts), rendered before Mode. */
  statusItems?: StatusBarItem[]
  reload: () => void
  providerMarks: MarkSet[]
  userMarks: MarkSet[]
  setMarkSet: (set: MarkSet) => void
  clearMarkNamespace: (namespace: string) => void
  clearAllUserMarks: () => void
  children: ReactNode
}

/**
 * The chrome every subview shares: `DocumentScreen` for the row-document half
 * (theme/quit commands, actions, `ctx.document`, layout, standard status) plus
 * the content-only `ctx.view` slice that viewers contribute on top.
 */
export function ViewScreen<T>({
  content,
  controller,
  streaming,
  actions,
  statusItems,
  reload,
  providerMarks,
  userMarks,
  setMarkSet,
  clearMarkNamespace,
  clearAllUserMarks,
  children,
}: ViewScreenProps<T>) {
  useProvideViewCommandContext({
    content,
    reload,
    marks: {
      setMarkSet,
      clearNamespace: clearMarkNamespace,
      clearAll: clearAllUserMarks,
      userMarks,
      providerMarks,
    },
  })

  const items: StatusBarItem[] = [
    ...(statusItems ?? []),
    ...(streaming ? [{ label: "Status:", value: "streaming" }] : []),
  ]

  return (
    <DocumentScreen
      controller={controller}
      titleBar={
        content.title
          ? { title: content.title, subtitle: content.format }
          : { title: content.format }
      }
      statusItems={items}
      actions={actions}
      context={{ kind: content.format, title: content.title, reload }}
    >
      {children}
    </DocumentScreen>
  )
}
