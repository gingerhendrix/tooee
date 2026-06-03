import { useEffect, useMemo, useRef } from "react"
import { useCommandRegistry } from "./context.js"
import type { Command, CommandHandler, CommandWhen } from "./types.js"
import type { Mode } from "./mode.js"

export interface ActionDefinition {
  id: string
  title: string
  hotkey?: string
  modes?: Mode[]
  handler: CommandHandler
  when?: CommandWhen
  category?: string
  group?: string
  icon?: string
  hidden?: boolean
}

export function useActions(actions: ActionDefinition[] | undefined): void {
  const { registry } = useCommandRegistry()
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  const key = useMemo(
    () =>
      actions
        ?.map(
          (a) =>
            `${a.id}:${a.title}:${a.hotkey ?? ""}:${a.category ?? ""}:${a.group ?? ""}:${a.icon ?? ""}:${a.hidden ?? false}`,
        )
        .join(",") ?? "",
    [actions],
  )

  useEffect(() => {
    const current = actionsRef.current
    if (!current || current.length === 0) return

    const unregisters = current.map((action, i) => {
      const command: Command = {
        id: action.id,
        title: action.title,
        defaultHotkey: action.hotkey,
        modes: action.modes,
        handler: (ctx) => actionsRef.current?.[i]?.handler(ctx),
        when: action.when ? (ctx) => actionsRef.current?.[i]?.when?.(ctx) ?? false : undefined,
        category: action.category,
        group: action.group,
        icon: action.icon,
        hidden: action.hidden,
      }
      return registry.register(command)
    })

    return () => {
      for (const unregister of unregisters) {
        unregister()
      }
    }
  }, [key, registry])
}
