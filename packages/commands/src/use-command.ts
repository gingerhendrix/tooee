import { useEffect, useRef } from "react"
import type { Command, CommandHandler, CommandWhen } from "./types.js"
import type { Mode } from "./mode.js"
import { useSurfaceRegistry } from "./context.js"

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
  /**
   * Register the command (default true). `false` unregisters it entirely — it
   * cannot be invoked and never appears in the palette or which-key. Use this
   * for genuinely disabled features; use `when` for context-dependent ones.
   */
  enabled?: boolean
}

export function useCommand(options: UseCommandOptions): void {
  const registry = useSurfaceRegistry()
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Key on the modes CONTENT, not the array identity: callers pass inline
  // array literals, and with a subscribable registry an identity-keyed effect
  // would re-register on every render — re-notifying the subscriber that
  // caused the render (an infinite update loop for components that both
  // register and observe commands, e.g. the command palette provider).
  const modesKey = options.modes?.join("|") ?? ""

  useEffect(() => {
    if (options.enabled === false) return

    const command: Command = {
      id: options.id,
      title: options.title,
      handler: (...args: Parameters<Command["handler"]>) => optionsRef.current.handler(...args),
      defaultHotkey: options.hotkey,
      // Read through the ref: the effect is keyed on modesKey (content), and
      // the ref holds the same-render options when the effect runs.
      modes: optionsRef.current.modes,
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
    modesKey,
    options.category,
    options.group,
    options.icon,
    options.hidden,
    options.enabled,
    registry,
  ])
}
