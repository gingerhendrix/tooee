import { createContext, useContext, useRef, useCallback, type ReactNode } from "react"
import { useKeyboard } from "@opentui/react"
import type { Command, CommandRegistry, ParsedHotkey } from "./types.ts"
import type { Mode } from "./mode.tsx"
import { ModeProvider, useMode } from "./mode.tsx"
import { parseHotkey } from "./parse.ts"
import { matchStep } from "./match.ts"
import { SequenceTracker } from "./sequence.ts"

const DEFAULT_MODES: Mode[] = ["command", "cursor"]

interface CommandContextValue {
  registry: CommandRegistry
  leaderKey?: string
}

const CommandContext = createContext<CommandContextValue | null>(null)

export interface CommandProviderProps {
  children: ReactNode
  leader?: string
  keymap?: Record<string, string>
  initialMode?: Mode
}

export function CommandProvider({ children, leader, keymap, initialMode }: CommandProviderProps) {
  return (
    <ModeProvider initialMode={initialMode}>
      <CommandDispatcher leader={leader} keymap={keymap}>
        {children}
      </CommandDispatcher>
    </ModeProvider>
  )
}

function CommandDispatcher({ children, leader, keymap }: { children: ReactNode; leader?: string; keymap?: Record<string, string> }) {
  const registryRef = useRef<CommandRegistry | null>(null)
  const mode = useMode()

  if (registryRef.current === null) {
    const commands = new Map<string, Command>()
    registryRef.current = {
      commands,
      register(command: Command) {
        commands.set(command.id, command)
        return () => {
          commands.delete(command.id)
        }
      },
      invoke(id: string) {
        const cmd = commands.get(id)
        if (cmd && (!cmd.when || cmd.when())) {
          cmd.handler()
        }
      },
    }
  }

  const trackerRef = useRef(new SequenceTracker())
  const parseCacheRef = useRef(new Map<string, ParsedHotkey>())

  const getParsedHotkey = useCallback((hotkey: string) => {
    const cache = parseCacheRef.current
    const cacheKey = `${hotkey}:${leader ?? ""}`
    let parsed = cache.get(cacheKey)
    if (!parsed) {
      parsed = parseHotkey(hotkey, leader)
      cache.set(cacheKey, parsed)
    }
    return parsed
  }, [leader])

  useKeyboard((event) => {
    if (event.defaultPrevented) return

    const registry = registryRef.current
    if (!registry) return

    const currentMode = mode

    // Collect eligible commands with their parsed hotkeys
    const singleStepCandidates: { command: Command; parsed: ParsedHotkey }[] = []
    const multiStepHotkeys: ParsedHotkey[] = []
    const multiStepCommands: Command[] = []

    for (const command of registry.commands.values()) {
      const commandModes = command.modes ?? DEFAULT_MODES
      if (!commandModes.includes(currentMode)) continue
      if (command.when && !command.when()) continue

      const hotkey = keymap?.[command.id] ?? command.defaultHotkey ?? command.hotkey
      if (!hotkey) continue

      const parsed = getParsedHotkey(hotkey)

      if (parsed.steps.length === 1) {
        singleStepCandidates.push({ command, parsed })
      } else {
        multiStepHotkeys.push(parsed)
        multiStepCommands.push(command)
      }
    }

    // Check multi-step sequences first (they consume buffer state)
    if (multiStepHotkeys.length > 0) {
      const idx = trackerRef.current.feed(event, multiStepHotkeys)
      if (idx >= 0) {
        event.preventDefault()
        multiStepCommands[idx]!.handler()
        return
      }
    }

    // Check single-step matches
    for (const { command, parsed } of singleStepCandidates) {
      if (matchStep(event, parsed.steps[0]!)) {
        event.preventDefault()
        command.handler()
        return
      }
    }
  })

  return (
    <CommandContext.Provider value={{ registry: registryRef.current, leaderKey: leader }}>
      {children}
    </CommandContext.Provider>
  )
}

export function useCommandContext(): { commands: Command[]; invoke: (id: string) => void } {
  const ctx = useContext(CommandContext)
  if (!ctx) {
    throw new Error("useCommandContext must be used within a CommandProvider")
  }

  const { registry } = ctx
  return {
    get commands() {
      return Array.from(registry.commands.values())
    },
    invoke: registry.invoke,
  }
}

export function useCommandRegistry(): CommandContextValue {
  const ctx = useContext(CommandContext)
  if (!ctx) {
    throw new Error("useCommandRegistry must be used within a CommandProvider")
  }
  return ctx
}
