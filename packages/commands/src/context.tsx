import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useKeyboard } from "@opentui/react"
import type {
  Command,
  CommandContext,
  CommandGroup,
  CommandRegistry,
  CommandSequenceState,
  ParsedHotkey,
  ParsedStep,
  RegisteredCommandGroup,
} from "./types.js"
import type { Mode } from "./mode.js"
import { ModeProvider, useMode, useSetMode } from "./mode.js"
import { parseHotkey } from "./parse.js"
import { matchStep } from "./match.js"
import { SequenceTracker } from "./sequence.js"

const DEFAULT_MODES: Mode[] = ["cursor"]

type ContextGetter = () => Partial<CommandContext>

interface CommandContextValue {
  registry: CommandRegistry
  leaderKey?: string
  contextSources: Map<string, ContextGetter>
  groups: Map<string, RegisteredCommandGroup>
}

const CommandContext = createContext<CommandContextValue | null>(null)
const CommandSequenceContext = createContext<CommandSequenceState | null>(null)

export interface CommandProviderProps {
  children: ReactNode
  leader?: string
  keymap?: Record<string, string>
  initialMode?: Mode
  sequenceTimeoutMs?: number
}

export function CommandProvider({
  children,
  leader,
  keymap,
  initialMode,
  sequenceTimeoutMs,
}: CommandProviderProps) {
  return (
    <ModeProvider initialMode={initialMode}>
      <CommandDispatcher leader={leader} keymap={keymap} sequenceTimeoutMs={sequenceTimeoutMs}>
        {children}
      </CommandDispatcher>
    </ModeProvider>
  )
}

function CommandDispatcher({
  children,
  leader,
  keymap,
  sequenceTimeoutMs,
}: {
  children: ReactNode
  leader?: string
  keymap?: Record<string, string>
  sequenceTimeoutMs?: number
}) {
  const registryRef = useRef<CommandRegistry | null>(null)
  const contextSourcesRef = useRef(new Map<string, ContextGetter>())
  const groupsRef = useRef(new Map<string, RegisteredCommandGroup>())
  const mode = useMode()
  const modeRef = useRef(mode)
  modeRef.current = mode
  const setMode = useSetMode()
  const [sequenceState, setSequenceState] = useState<CommandSequenceState | null>(null)
  const clearSequenceStateRef = useRef(() => setSequenceState(null))
  clearSequenceStateRef.current = () => setSequenceState(null)

  const buildCtx = useCallback((): CommandContext => {
    const ctx: Record<string, any> = {
      mode: modeRef.current,
      setMode,
      commands: {
        invoke: (id: string) => registryRef.current?.invoke(id),
        list: () => Array.from(registryRef.current?.commands.values() ?? []),
      },
      exit: () => {},
    }
    for (const getter of contextSourcesRef.current.values()) {
      Object.assign(ctx, getter())
    }
    return ctx as CommandContext
  }, [setMode])

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
        const ctx = buildCtx()
        const cmd = commands.get(id)
        if (cmd && (!cmd.when || cmd.when(ctx))) {
          cmd.handler(ctx)
        }
      },
    }
  }

  const trackerRef = useRef(
    new SequenceTracker({
      timeout: sequenceTimeoutMs,
      onReset: () => clearSequenceStateRef.current(),
    }),
  )
  const parseCacheRef = useRef(new Map<string, ParsedHotkey>())

  const getParsedHotkey = useCallback(
    (hotkey: string) => {
      const cache = parseCacheRef.current
      const cacheKey = `${hotkey}:${leader ?? ""}`
      let parsed = cache.get(cacheKey)
      if (!parsed) {
        parsed = parseHotkey(hotkey, leader)
        cache.set(cacheKey, parsed)
      }
      return parsed
    },
    [leader],
  )

  useKeyboard((event) => {
    if (event.defaultPrevented) return

    const registry = registryRef.current
    if (!registry) return

    const currentMode = mode
    const ctx = buildCtx()

    // Collect eligible commands with their parsed hotkeys
    const singleStepCandidates: { command: Command; parsed: ParsedHotkey }[] = []
    const multiStepCandidates: { command: Command; hotkey: string; parsed: ParsedHotkey }[] = []

    for (const command of registry.commands.values()) {
      const commandModes = command.modes ?? DEFAULT_MODES
      if (!commandModes.includes(currentMode)) continue
      if (command.when && !command.when(ctx)) continue

      const hotkey = keymap?.[command.id] ?? command.defaultHotkey
      if (!hotkey) continue

      const parsed = getParsedHotkey(hotkey)

      if (parsed.steps.length === 1) {
        singleStepCandidates.push({ command, parsed })
      } else {
        multiStepCandidates.push({ command, hotkey, parsed })
      }
    }

    // Check multi-step sequences first (they consume buffer state)
    if (multiStepCandidates.length > 0) {
      const multiStepHotkeys = multiStepCandidates.map((candidate) => candidate.parsed)
      const result = trackerRef.current.feedWithState(event, multiStepHotkeys)
      if (result.matchedIndex >= 0) {
        event.preventDefault()
        setSequenceState(null)
        multiStepCandidates[result.matchedIndex]!.command.handler(ctx)
        return
      }

      if (result.pending) {
        const firstCandidate = multiStepCandidates[result.pending.indexes[0]!]!
        setSequenceState({
          prefix: firstCandidate.parsed.steps.slice(0, result.pending.prefixLength),
          candidates: result.pending.indexes
            .map((idx) => multiStepCandidates[idx]!)
            .filter(({ command }) => !command.hidden)
            .map(({ command, hotkey, parsed }) => ({
              command,
              hotkey,
              steps: parsed.steps,
              remainingSteps: parsed.steps.slice(result.pending!.prefixLength),
              nextStep: parsed.steps[result.pending!.prefixLength]!,
              group: groupsRef.current.get(
                stepsKey(parsed.steps.slice(0, result.pending!.prefixLength + 1)),
              ),
            })),
        })
        event.preventDefault()
        return
      }

      setSequenceState(null)
    }

    // Check single-step matches
    for (const { command, parsed } of singleStepCandidates) {
      if (matchStep(event, parsed.steps[0]!)) {
        event.preventDefault()
        setSequenceState(null)
        command.handler(ctx)
        return
      }
    }
  })

  useEffect(() => {
    trackerRef.current.reset()
    setSequenceState(null)
  }, [mode])

  const ctxValue = useMemo(
    () => ({
      registry: registryRef.current!,
      leaderKey: leader,
      contextSources: contextSourcesRef.current,
      groups: groupsRef.current,
    }),
    [leader],
  )

  return (
    <CommandContext.Provider value={ctxValue}>
      <CommandSequenceContext value={sequenceState}>{children}</CommandSequenceContext>
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

export function useCommandSequenceState(): CommandSequenceState | null {
  return useContext(CommandSequenceContext)
}

export function useCommandGroup(group: CommandGroup): void {
  const ctx = useContext(CommandContext)
  if (!ctx) {
    throw new Error("useCommandGroup must be used within a CommandProvider")
  }

  const groupRef = useRef(group)
  groupRef.current = group
  const { groups, leaderKey } = ctx

  useEffect(() => {
    const parsed = parseHotkey(groupRef.current.prefix, leaderKey)
    const registered: RegisteredCommandGroup = {
      ...groupRef.current,
      prefixKey: stepsKey(parsed.steps),
    }
    groups.set(registered.prefixKey, registered)
    return () => {
      groups.delete(registered.prefixKey)
    }
  }, [
    group.id,
    group.prefix,
    group.title,
    group.description,
    group.icon,
    group.order,
    groups,
    leaderKey,
  ])
}

function stepsKey(steps: ParsedStep[]): string {
  return steps.map(formatStepKey).join(" ")
}

function formatStepKey(step: ParsedStep): string {
  const modifiers = []
  if (step.ctrl) modifiers.push("ctrl")
  if (step.meta) modifiers.push("meta")
  if (step.option) modifiers.push("option")
  if (step.shift) modifiers.push("shift")
  modifiers.push(step.key)
  return modifiers.join("+")
}

let nextContextSourceId = 0

export function useProvideCommandContext(getter: () => Partial<CommandContext>): void {
  const ctx = useContext(CommandContext)
  if (!ctx) {
    throw new Error("useProvideCommandContext must be used within a CommandProvider")
  }

  const idRef = useRef<string | null>(null)
  if (idRef.current === null) {
    idRef.current = `ctx-${nextContextSourceId++}`
  }

  const getterRef = useRef(getter)
  getterRef.current = getter

  const { contextSources } = ctx

  useEffect(() => {
    const id = idRef.current!
    contextSources.set(id, () => getterRef.current())
    return () => {
      contextSources.delete(id)
    }
  }, [contextSources])
}
