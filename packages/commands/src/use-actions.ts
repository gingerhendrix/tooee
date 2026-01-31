import { useEffect, useMemo, useRef } from "react"
import { useKeyboard } from "@opentui/react"
import { useCommandRegistry } from "./context.tsx"
import { parseHotkey } from "./parse.ts"
import { matchStep } from "./match.ts"
import { SequenceTracker } from "./sequence.ts"
import type { Command, ParsedHotkey } from "./types.ts"

export interface ActionDefinition {
  id: string
  title: string
  hotkey?: string
  handler: () => void
  when?: () => boolean
}

export function useActions(actions: ActionDefinition[] | undefined): void {
  const { registry, leaderKey } = useCommandRegistry()
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  const key = useMemo(
    () => actions?.map((a) => `${a.id}:${a.hotkey ?? ""}`).join(",") ?? "",
    [actions],
  )

  const parsedRef = useRef<{ parsed: ParsedHotkey; index: number }[]>([])
  const trackerRef = useRef<SequenceTracker | null>(null)

  useEffect(() => {
    const current = actionsRef.current
    if (!current || current.length === 0) {
      parsedRef.current = []
      trackerRef.current = null
      return
    }

    const parsed: { parsed: ParsedHotkey; index: number }[] = []
    let needsTracker = false
    for (let i = 0; i < current.length; i++) {
      const action = current[i]!
      if (action.hotkey) {
        const p = parseHotkey(action.hotkey, leaderKey)
        parsed.push({ parsed: p, index: i })
        if (p.steps.length > 1) needsTracker = true
      }
    }
    parsedRef.current = parsed
    trackerRef.current = needsTracker ? new SequenceTracker() : null
  }, [key, leaderKey])

  useEffect(() => {
    const current = actionsRef.current
    if (!current || current.length === 0) return

    const unregisters = current.map((action, i) => {
      const command: Command = {
        id: action.id,
        title: action.title,
        hotkey: action.hotkey,
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

  useKeyboard((event) => {
    const current = actionsRef.current
    if (!current || current.length === 0) return
    if (event.defaultPrevented) return

    for (const { parsed, index } of parsedRef.current) {
      const action = current[index]
      if (!action) continue
      if (action.when && !action.when()) continue

      if (parsed.steps.length === 1) {
        if (matchStep(event, parsed.steps[0]!)) {
          event.preventDefault()
          action.handler()
          return
        }
      } else {
        const tracker = trackerRef.current
        if (tracker) {
          const idx = tracker.feed(event, [parsed])
          if (idx === 0) {
            event.preventDefault()
            action.handler()
            return
          }
        }
      }
    }
  })
}
