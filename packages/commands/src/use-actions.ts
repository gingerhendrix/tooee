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
}

export function useActions(actions: ActionDefinition[] | undefined): void {
  const { registry } = useCommandRegistry()
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  const key = useMemo(
    () => actions?.map((a) => `${a.id}:${a.hotkey ?? ""}`).join(",") ?? "",
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
