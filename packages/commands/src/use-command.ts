import { useEffect, useRef } from "react"
import type { Command, CommandHandler, CommandWhen } from "./types.js"
import type { Mode } from "./mode.jsx"
import { useCommandRegistry } from "./context.jsx"

export interface UseCommandOptions {
  id: string
  title: string
  handler: CommandHandler
  hotkey?: string
  modes?: Mode[]
  category?: string
  group?: string
  icon?: string
  when?: CommandWhen
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
      when: optionsRef.current.when ? (ctx) => optionsRef.current.when!(ctx) : undefined,
      hidden: options.hidden,
    }
    return registry.register(command)
  }, [
    options.id,
    options.title,
    options.hotkey,
    options.modes,
    options.category,
    options.group,
    options.icon,
    options.hidden,
    registry,
  ])
}
