import { useEffect, useRef } from "react"
import type { Command } from "./types.ts"
import type { Mode } from "./mode.tsx"
import { useCommandRegistry } from "./context.tsx"

export interface UseCommandOptions {
  id: string
  title: string
  handler: () => void
  hotkey?: string
  modes?: Mode[]
  category?: string
  group?: string
  icon?: string
  when?: () => boolean
  hidden?: boolean
}

export function useCommand(options: UseCommandOptions): void {
  const { registry } = useCommandRegistry()
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const command: Command = {
      id: options.id,
      title: options.title,
      handler: (...args: Parameters<Command["handler"]>) => optionsRef.current.handler(...args),
      defaultHotkey: options.hotkey,
      modes: options.modes,
      category: options.category,
      group: options.group,
      icon: options.icon,
      when: optionsRef.current.when ? () => optionsRef.current.when!() : undefined,
      hidden: options.hidden,
    }
    return registry.register(command)
  }, [options.id, options.title, options.hotkey, options.modes, options.category, options.group, options.icon, options.hidden, registry])
}
