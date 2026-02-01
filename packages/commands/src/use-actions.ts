import { useEffect, useMemo, useRef } from "react"
import { useCommandRegistry } from "./context.tsx"
import type { Command } from "./types.ts"
import type { Mode } from "./mode.tsx"

export interface ActionDefinition {
  id: string
  title: string
  hotkey?: string
  modes?: Mode[]
  handler: () => void
  when?: () => boolean
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
        handler: () => actionsRef.current?.[i]?.handler(),
        when: action.when ? () => actionsRef.current?.[i]?.when?.() ?? false : undefined,
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
