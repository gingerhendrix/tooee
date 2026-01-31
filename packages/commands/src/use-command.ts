import { useEffect, useRef } from "react"
import { useKeyboard } from "@opentui/react"
import type { Command, ParsedHotkey } from "./types.ts"
import { parseHotkey } from "./parse.ts"
import { matchStep } from "./match.ts"
import { SequenceTracker } from "./sequence.ts"
import { useCommandRegistry } from "./context.tsx"

export interface UseCommandOptions {
  id: string
  title: string
  handler: () => void
  hotkey?: string
  category?: string
  icon?: string
  when?: () => boolean
  hidden?: boolean
}

export function useCommand(options: UseCommandOptions): void {
  const { registry, leaderKey } = useCommandRegistry()
  const trackerRef = useRef<SequenceTracker | null>(null)
  const parsedRef = useRef<ParsedHotkey | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  // Register command
  useEffect(() => {
    const command: Command = {
      id: options.id,
      title: options.title,
      handler: (...args: Parameters<Command["handler"]>) => optionsRef.current.handler(...args),
      hotkey: options.hotkey,
      category: options.category,
      icon: options.icon,
      when: optionsRef.current.when ? () => optionsRef.current.when!() : undefined,
      hidden: options.hidden,
    }
    return registry.register(command)
  }, [options.id, options.title, options.hotkey, options.category, options.icon, options.hidden, registry])

  // Parse hotkey
  useEffect(() => {
    if (options.hotkey) {
      parsedRef.current = parseHotkey(options.hotkey, leaderKey)
      // Only need sequence tracker if multi-step
      if (parsedRef.current.steps.length > 1) {
        trackerRef.current = new SequenceTracker()
      } else {
        trackerRef.current = null
      }
    } else {
      parsedRef.current = null
      trackerRef.current = null
    }
  }, [options.hotkey, leaderKey])

  // Listen for keyboard events
  useKeyboard((event) => {
    const parsed = parsedRef.current
    const opts = optionsRef.current
    if (!parsed) return
    if (opts.when && !opts.when()) return
    if (event.defaultPrevented) return

    if (parsed.steps.length === 1) {
      // Single step — direct match
      if (matchStep(event, parsed.steps[0]!)) {
        event.preventDefault()
        opts.handler()
      }
    } else {
      // Multi-step sequence
      const tracker = trackerRef.current
      if (tracker) {
        const idx = tracker.feed(event, [parsed])
        if (idx === 0) {
          event.preventDefault()
          opts.handler()
        }
      }
    }
  })
}
