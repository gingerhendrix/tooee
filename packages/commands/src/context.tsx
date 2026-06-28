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
  ActiveCommandSurface,
  Command,
  CommandContext,
  CommandGroup,
  CommandRegistry,
  CommandSequenceState,
  CommandSurfaceEntry,
  CommandSurfaceRole,
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

interface CommandSurfaceStackValue {
  /** Register a surface; returns an unregister function. Mutates entry.order. */
  register: (entry: CommandSurfaceEntry) => () => void
  /** Resolve the topmost modal surface (deepest, then most-recently registered). */
  getActiveModalSurface: () => CommandSurfaceEntry | null
  /** Reactive metadata for the active modal surface (for which-key/help). */
  activeModalSurface: ActiveCommandSurface | null
}

const CommandContext = createContext<CommandContextValue | null>(null)
const CommandSequenceContext = createContext<CommandSequenceState | null>(null)
const CommandSurfaceStackContext = createContext<CommandSurfaceStackValue | null>(null)
/** Nesting depth of the nearest command surface (0 at the root app). */
const CommandSurfaceDepthContext = createContext(0)

/**
 * Build a command registry whose `invoke` resolves the command context lazily
 * via `getCtx`, so a surface always dispatches with its own (local) mode and
 * the current shared context sources.
 */
function createRegistry(getCtx: () => CommandContext): CommandRegistry {
  const commands = new Map<string, Command>()
  return {
    commands,
    register(command: Command) {
      commands.set(command.id, command)
      return () => {
        commands.delete(command.id)
      }
    },
    invoke(id: string) {
      const ctx = getCtx()
      const cmd = commands.get(id)
      if (cmd && (!cmd.when || cmd.when(ctx))) {
        cmd.handler(ctx)
      }
    },
  }
}

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

  const buildCtxRef = useRef(buildCtx)
  buildCtxRef.current = buildCtx

  if (registryRef.current === null) {
    registryRef.current = createRegistry(() => buildCtxRef.current())
  }

  // --- Command surface stack ----------------------------------------------
  // The root registry above is the implicit base surface. Modal overlays push
  // surfaces on top of it; while a modal surface is topmost, key dispatch is
  // arbitrated to that surface only and the root (and lower surfaces) are
  // suspended — even for keys the surface does not handle.
  const surfaceEntriesRef = useRef<CommandSurfaceEntry[]>([])
  const surfaceOrderRef = useRef(0)
  const [surfaceVersion, setSurfaceVersion] = useState(0)

  const registerSurface = useCallback((entry: CommandSurfaceEntry) => {
    entry.order = surfaceOrderRef.current++
    surfaceEntriesRef.current = [...surfaceEntriesRef.current, entry]
    setSurfaceVersion((v) => v + 1)
    return () => {
      surfaceEntriesRef.current = surfaceEntriesRef.current.filter((e) => e !== entry)
      setSurfaceVersion((v) => v + 1)
    }
  }, [])

  const getActiveModalSurface = useCallback((): CommandSurfaceEntry | null => {
    let best: CommandSurfaceEntry | null = null
    for (const entry of surfaceEntriesRef.current) {
      if (entry.role !== "modal") continue
      if (
        best === null ||
        entry.depth > best.depth ||
        (entry.depth === best.depth && entry.order > best.order)
      ) {
        best = entry
      }
    }
    return best
  }, [])

  const activeModalSurface = useMemo<ActiveCommandSurface | null>(() => {
    const surface = getActiveModalSurface()
    return surface ? { id: surface.id, role: surface.role } : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getActiveModalSurface, surfaceVersion])

  const surfaceStackValue = useMemo<CommandSurfaceStackValue>(
    () => ({ register: registerSurface, getActiveModalSurface, activeModalSurface }),
    [registerSurface, getActiveModalSurface, activeModalSurface],
  )

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

    const rootRegistry = registryRef.current
    if (!rootRegistry) return

    // Arbitration: a topmost modal surface owns input; otherwise the root app.
    const activeSurface = getActiveModalSurface()
    const registry = activeSurface ? activeSurface.registry : rootRegistry
    const currentMode = activeSurface ? activeSurface.getMode() : modeRef.current
    const ctx = activeSurface ? activeSurface.buildCtx() : buildCtx()

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

    // A modal surface swallows unhandled keys: dispatch never falls through to
    // the root app while a modal surface is topmost.
  })

  useEffect(() => {
    trackerRef.current.reset()
    setSequenceState(null)
  }, [mode])

  // Reset any in-flight sequence when keyboard ownership changes (e.g. a modal
  // surface opens/closes) so partial chords don't leak across surfaces. Passive
  // surfaces such as which-key must not clear the sequence they are displaying.
  useEffect(() => {
    trackerRef.current.reset()
    setSequenceState(null)
  }, [activeModalSurface?.id])

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
      <CommandSurfaceStackContext.Provider value={surfaceStackValue}>
        <CommandSequenceContext value={sequenceState}>{children}</CommandSequenceContext>
      </CommandSurfaceStackContext.Provider>
    </CommandContext.Provider>
  )
}

export interface CommandSurfaceProviderProps {
  children: ReactNode
  /** Stable id for the surface (typically the overlay id). */
  id: string
  /** Interaction role (default "modal"). */
  role?: CommandSurfaceRole
  /** Initial local mode for this surface (default "cursor"). */
  initialMode?: Mode
}

/**
 * Mounts an overlay-owned command surface. Children registered via `useCommand`
 * target this surface's local registry, and `useMode`/`useSetMode` read/write
 * this surface's local mode instead of the root app's mode.
 *
 * While a `modal` surface is topmost it owns keyboard input and suspends the
 * parent app's commands; a `passive` surface never becomes the keyboard owner.
 */
export function CommandSurfaceProvider({
  children,
  id,
  role = "modal",
  initialMode = "cursor",
}: CommandSurfaceProviderProps) {
  return (
    <ModeProvider initialMode={initialMode}>
      <CommandSurfaceInner id={id} role={role}>
        {children}
      </CommandSurfaceInner>
    </ModeProvider>
  )
}

function CommandSurfaceInner({
  children,
  id,
  role,
}: {
  children: ReactNode
  id: string
  role: CommandSurfaceRole
}) {
  const parent = useContext(CommandContext)
  const stack = useContext(CommandSurfaceStackContext)
  if (!parent || !stack) {
    throw new Error("CommandSurfaceProvider must be used within a CommandProvider")
  }

  const parentDepth = useContext(CommandSurfaceDepthContext)
  const depth = parentDepth + 1

  const mode = useMode()
  const setMode = useSetMode()
  const modeRef = useRef(mode)
  modeRef.current = mode

  const registryRef = useRef<CommandRegistry | null>(null)

  const buildCtx = useCallback((): CommandContext => {
    const ctx: Record<string, any> = {
      mode: modeRef.current,
      setMode,
      commands: {
        invoke: (cmdId: string) => registryRef.current?.invoke(cmdId),
        list: () => Array.from(registryRef.current?.commands.values() ?? []),
      },
      exit: () => {},
    }
    for (const getter of parent.contextSources.values()) {
      Object.assign(ctx, getter())
    }
    return ctx as CommandContext
  }, [parent.contextSources, setMode])

  const buildCtxRef = useRef(buildCtx)
  buildCtxRef.current = buildCtx

  if (registryRef.current === null) {
    registryRef.current = createRegistry(() => buildCtxRef.current())
  }

  const { register } = stack
  useEffect(() => {
    const entry: CommandSurfaceEntry = {
      id,
      role,
      depth,
      order: 0,
      registry: registryRef.current!,
      getMode: () => modeRef.current,
      buildCtx: () => buildCtxRef.current(),
    }
    return register(entry)
  }, [register, id, role, depth])

  const ctxValue = useMemo<CommandContextValue>(
    () => ({
      registry: registryRef.current!,
      leaderKey: parent.leaderKey,
      contextSources: parent.contextSources,
      groups: parent.groups,
    }),
    [parent.leaderKey, parent.contextSources, parent.groups],
  )

  return (
    <CommandContext.Provider value={ctxValue}>
      <CommandSurfaceDepthContext.Provider value={depth}>
        {children}
      </CommandSurfaceDepthContext.Provider>
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

/**
 * Metadata for the topmost modal command surface, or null when the root app is
 * the active surface. Intended for which-key/help to read shortcuts from the
 * active interaction surface.
 */
export function useActiveCommandSurface(): ActiveCommandSurface | null {
  const ctx = useContext(CommandSurfaceStackContext)
  return ctx ? ctx.activeModalSurface : null
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
