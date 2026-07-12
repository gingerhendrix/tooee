import { createContext, useContext, useRef, useCallback, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useKeyboard } from "@opentui/react";
import { useSelector } from "@xstate/store-react";
import type {
  ActiveCommandSurface,
  Command,
  CommandContext,
  CommandGroup,
  CommandRegistry,
  CommandSequenceState,
  CommandSurfaceRole,
  RegisteredCommandGroup,
} from "./types.js";
import type { Mode } from "./mode.js";
import { ModeProvider, useMode, useSetMode } from "./mode.js";
import { parseHotkey } from "./parse.js";
import {
  ROOT_SURFACE_ID,
  createCommandStore,
  selectActiveModalSurface,
  selectSequence,
  selectSurfaceCommandMap,
  stepsKey,
} from "./command-store.js";
import type { CommandStore, ContextGetter, SurfaceRecord } from "./command-store.js";

interface CommandContextValue {
  registry: CommandRegistry;
  leaderKey?: string;
  contextSources: Map<string, ContextGetter>;
  groups: Map<string, RegisteredCommandGroup>;
}

/** Internal provider value: the store plus the surface this subtree registers to. */
interface CommandStoreContextValue {
  commandStore: CommandStore;
  /** The surface record `useCommand` registrations under this subtree target. */
  surface: SurfaceRecord;
  leaderKey?: string;
}

const CommandContext = createContext<CommandStoreContextValue | null>(null);
const CommandSequenceContext = createContext<CommandSequenceState | null>(null);
/** Nesting depth of the nearest command surface (0 at the root app). */
const CommandSurfaceDepthContext = createContext(0);

/**
 * Fallback store for hooks that must not throw outside a CommandProvider
 * (useActiveCommandSurface, useSurfaceCommands). Never dispatched to.
 */
const FALLBACK_COMMAND_STORE = createCommandStore({
  root: {
    // Placeholder context: augmented domain fields (overlay, view, ...) are
    // only present where their providers run; dispatch never reaches this.
    buildCtx: () =>
      ({
        commands: { invoke: () => {}, list: () => [] },
        exit: () => {},
        mode: "cursor",
        setMode: () => {},
      }) as unknown as CommandContext,
    getMode: () => "cursor",
  },
});

export interface CommandProviderProps {
  children: ReactNode;
  leader?: string;
  keymap?: Record<string, string>;
  initialMode?: Mode;
  sequenceTimeoutMs?: number;
}

interface RootAccess {
  buildCtx: () => CommandContext;
  getMode: () => Mode;
}

export function CommandProvider({
  children,
  leader,
  keymap,
  initialMode,
  sequenceTimeoutMs,
}: CommandProviderProps) {
  // The store is created here (above the root ModeProvider) so mode changes
  // can be routed into it as transitions; the dispatcher below installs the
  // real root accessors before any key can dispatch.
  const rootAccessRef = useRef<RootAccess>({
    // Placeholder until CommandDispatcher installs the real accessors on its
    // first render (before any key can dispatch).
    buildCtx: () =>
      ({
        commands: { invoke: () => {}, list: () => [] },
        exit: () => {},
        mode: initialMode ?? "cursor",
        setMode: () => {},
      }) as unknown as CommandContext,
    getMode: () => initialMode ?? "cursor",
  });

  const storeRef = useRef<CommandStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createCommandStore({
      keymap,
      leader,
      root: {
        buildCtx: () => rootAccessRef.current.buildCtx(),
        getMode: () => rootAccessRef.current.getMode(),
      },
      sequenceTimeoutMs,
    });
  }
  const commandStore = storeRef.current;

  // Root mode changes are transitions: reset any pending chord synchronously
  // (this replaces the old post-render tracker-reset effect).
  const handleModeChange = useCallback(
    () => commandStore.modeChanged(ROOT_SURFACE_ID),
    [commandStore],
  );

  return (
    <ModeProvider initialMode={initialMode} onModeChange={handleModeChange}>
      <CommandDispatcher
        commandStore={commandStore}
        rootAccess={rootAccessRef}
        leader={leader}
        keymap={keymap}
        sequenceTimeoutMs={sequenceTimeoutMs}
      >
        {children}
      </CommandDispatcher>
    </ModeProvider>
  );
}

function CommandDispatcher({
  children,
  commandStore,
  rootAccess,
  leader,
  keymap,
  sequenceTimeoutMs,
}: {
  children: ReactNode;
  commandStore: CommandStore;
  rootAccess: { current: RootAccess };
  leader?: string;
  keymap?: Record<string, string>;
  sequenceTimeoutMs?: number;
}) {
  const mode = useMode();
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const setMode = useSetMode();

  const buildCtx = useCallback((): CommandContext => {
    const registry = commandStore.registryFor(commandStore.rootRecord);
    const ctx: Record<string, any> = {
      commands: {
        invoke: (id: string) => registry.invoke(id),
        list: () => Array.from(registry.commands.values()),
      },
      exit: () => {},
      mode: modeRef.current,
      setMode,
    };
    for (const getter of commandStore.store.getSnapshot().context.contextSources.values()) {
      Object.assign(ctx, getter());
    }
    return ctx as CommandContext;
  }, [commandStore, setMode]);

  const buildCtxRef = useRef(buildCtx);
  buildCtxRef.current = buildCtx;

  // Install the live root accessors and config (ref writes, same pattern as
  // the previous modeRef mirrors; leader/keymap are read per dispatch).
  rootAccess.current.getMode = () => modeRef.current;
  rootAccess.current.buildCtx = () => buildCtxRef.current();
  commandStore.setConfig({ keymap, leader, sequenceTimeoutMs });

  useKeyboard((event) => {
    if (event.defaultPrevented) {
      return;
    }
    const result = commandStore.key(event);
    if (result.handled) {
      event.preventDefault();
      result.invoke?.();
    }
  });

  // Clear the store's key buffer and pending timeout on dispatcher unmount so
  // the timer cannot fire after the tree is gone.
  useEffect(() => () => commandStore.dispose(), [commandStore]);

  const sequenceState = useSelector(commandStore.store, (s) => selectSequence(s.context));

  const ctxValue = useMemo<CommandStoreContextValue>(
    () => ({
      commandStore,
      leaderKey: leader,
      surface: commandStore.rootRecord,
    }),
    [commandStore, leader],
  );

  return (
    <CommandContext.Provider value={ctxValue}>
      <CommandSequenceContext value={sequenceState}>{children}</CommandSequenceContext>
    </CommandContext.Provider>
  );
}

export interface CommandSurfaceProviderProps {
  children: ReactNode;
  /** Stable id for the surface (typically the overlay id). */
  id: string;
  /** Interaction role (default "modal"). */
  role?: CommandSurfaceRole;
  /** Initial local mode for this surface (default "cursor"). */
  initialMode?: Mode;
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
  const parent = useContext(CommandContext);
  if (!parent) {
    throw new Error("CommandSurfaceProvider must be used within a CommandProvider");
  }
  const { commandStore } = parent;

  // Surface-local mode changes are transitions too (F-08): a mid-chord mode
  // switch on a modal surface resets the pending sequence.
  const handleModeChange = useCallback(() => commandStore.modeChanged(id), [commandStore, id]);

  return (
    <ModeProvider initialMode={initialMode} onModeChange={handleModeChange}>
      <CommandSurfaceInner id={id} role={role}>
        {children}
      </CommandSurfaceInner>
    </ModeProvider>
  );
}

function CommandSurfaceInner({
  children,
  id,
  role,
}: {
  children: ReactNode;
  id: string;
  role: CommandSurfaceRole;
}) {
  const parent = useContext(CommandContext);
  if (!parent) {
    throw new Error("CommandSurfaceProvider must be used within a CommandProvider");
  }
  const { commandStore } = parent;

  const parentDepth = useContext(CommandSurfaceDepthContext);
  const depth = parentDepth + 1;

  const mode = useMode();
  const setMode = useSetMode();
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const buildCtx = useCallback((): CommandContext => {
    const registry = commandStore.registryFor(recordRef.current!);
    const ctx: Record<string, any> = {
      commands: {
        invoke: (cmdId: string) => registry.invoke(cmdId),
        list: () => Array.from(registry.commands.values()),
      },
      exit: () => {},
      mode: modeRef.current,
      setMode,
    };
    for (const getter of commandStore.store.getSnapshot().context.contextSources.values()) {
      Object.assign(ctx, getter());
    }
    return ctx as CommandContext;
  }, [commandStore, setMode]);

  const buildCtxRef = useRef(buildCtx);
  buildCtxRef.current = buildCtx;

  const recordRef = useRef<SurfaceRecord | null>(null);
  if (
    recordRef.current === null ||
    recordRef.current.id !== id ||
    recordRef.current.role !== role ||
    recordRef.current.depth !== depth
  ) {
    recordRef.current = {
      buildCtx: () => buildCtxRef.current(),
      depth,
      getMode: () => modeRef.current,
      id,
      order: 0,
      role,
    };
  }
  const record = recordRef.current;

  // Mount/unmount registration is a keep-effect: it synchronizes the React
  // tree with the store's surface stack.
  useEffect(() => commandStore.pushSurface(record), [commandStore, record]);

  const ctxValue = useMemo<CommandStoreContextValue>(
    () => ({
      commandStore,
      leaderKey: parent.leaderKey,
      surface: record,
    }),
    [commandStore, record, parent.leaderKey],
  );

  return (
    <CommandContext.Provider value={ctxValue}>
      <CommandSurfaceDepthContext.Provider value={depth}>
        {children}
      </CommandSurfaceDepthContext.Provider>
    </CommandContext.Provider>
  );
}

export function useCommandContext(): { commands: Command[]; invoke: (id: string) => void } {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandContext must be used within a CommandProvider");
  }
  const { commandStore, surface } = ctx;

  // Reactive: consumers re-render when a command registers or unregisters on
  // this surface (the per-surface map is identity-stable otherwise).
  const commandMap = useSelector(commandStore.store, (s) =>
    selectSurfaceCommandMap(s.context, surface.id),
  );
  const registry = commandStore.registryFor(surface);

  return useMemo(
    () => ({
      commands: commandMap ? Array.from(commandMap.values()) : [],
      invoke: registry.invoke,
    }),
    [commandMap, registry],
  );
}

/**
 * Builds the live command context of the nearest surface — the same value
 * command handlers receive. For callers that must hand a context to something
 * outside the dispatch path (e.g. a context-menu entry resolver).
 */
export function useBuildCommandContext(): () => CommandContext {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useBuildCommandContext must be used within a CommandProvider");
  }
  const { surface } = ctx;
  return useCallback(() => surface.buildCtx(), [surface]);
}

/**
 * Internal: the stable registry facade for the nearest surface, without
 * subscribing to store changes. Registration hooks (useCommand/useActions)
 * only need the facade; subscribing them would re-render every command host
 * on unrelated group/context-source registrations.
 */
export function useSurfaceRegistry(): CommandRegistry {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandRegistry must be used within a CommandProvider");
  }
  return ctx.commandStore.registryFor(ctx.surface);
}

export function useCommandRegistry(): CommandContextValue {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandRegistry must be used within a CommandProvider");
  }
  const { commandStore, surface, leaderKey } = ctx;

  // Subscribe to the slices so captured maps stay current across renders (the
  // maps are immutable snapshots now, not shared mutable maps).
  const groups = useSelector(commandStore.store, (s) => s.context.groups);
  const contextSources = useSelector(commandStore.store, (s) => s.context.contextSources);
  const registry = commandStore.registryFor(surface);

  return useMemo(
    () => ({
      contextSources: contextSources as Map<string, ContextGetter>,
      groups: groups as Map<string, RegisteredCommandGroup>,
      leaderKey,
      registry,
    }),
    [registry, leaderKey, contextSources, groups],
  );
}

export function useCommandSequenceState(): CommandSequenceState | null {
  return useContext(CommandSequenceContext);
}

/**
 * Id of the command surface this subtree registers commands to: the nearest
 * enclosing `CommandSurfaceProvider`'s id, or `ROOT_SURFACE_ID` at the app
 * root. Compare against `useActiveCommandSurface()` to tell whether another
 * modal surface currently owns keyboard input above this subtree.
 */
export function useCommandSurfaceId(): string {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandSurfaceId must be used within a CommandProvider");
  }
  return ctx.surface.id;
}

/**
 * Metadata for the topmost modal command surface, or null when the root app is
 * the active surface. Intended for which-key/help to read shortcuts from the
 * active interaction surface. `commands` is reactive (F-13).
 */
export function useActiveCommandSurface(): ActiveCommandSurface | null {
  const ctx = useContext(CommandContext);
  const store = (ctx?.commandStore ?? FALLBACK_COMMAND_STORE).store;

  const record = useSelector(store, (s) => selectActiveModalSurface(s.context));
  const commandMap = useSelector(store, (s) => {
    const active = selectActiveModalSurface(s.context);
    return active ? selectSurfaceCommandMap(s.context, active.id) : undefined;
  });

  return useMemo(() => {
    if (!record) return null;
    return {
      commands: commandMap ? Array.from(commandMap.values()) : [],
      id: record.id,
      role: record.role as CommandSurfaceRole,
    };
  }, [record, commandMap]);
}

/**
 * Commands registered on a surface (reactive). Defaults to the active modal
 * surface, falling back to the root surface when none is active.
 */
export function useSurfaceCommands(surfaceId?: string): readonly Command[] {
  const ctx = useContext(CommandContext);
  const store = (ctx?.commandStore ?? FALLBACK_COMMAND_STORE).store;

  const commandMap = useSelector(store, (s) => {
    const id = surfaceId ?? selectActiveModalSurface(s.context)?.id ?? ROOT_SURFACE_ID;
    return selectSurfaceCommandMap(s.context, id);
  });

  return useMemo(() => (commandMap ? Array.from(commandMap.values()) : []), [commandMap]);
}

/**
 * Advanced/internal — subject to change. The command store instance backing
 * this provider tree, for bridges that must reach the dispatch machinery
 * (e.g. the shell's overlay-replacement sequence reset).
 */
export function useCommandStore(): CommandStore {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandStore must be used within a CommandProvider");
  }
  return ctx.commandStore;
}

export function useCommandGroup(group: CommandGroup): void {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandGroup must be used within a CommandProvider");
  }

  const groupRef = useRef(group);
  groupRef.current = group;
  const { commandStore, leaderKey } = ctx;

  useEffect(() => {
    const parsed = parseHotkey(groupRef.current.prefix, leaderKey);
    const registered: RegisteredCommandGroup = {
      ...groupRef.current,
      prefixKey: stepsKey(parsed.steps),
    };
    commandStore.store.trigger.groupRegistered({ group: registered });
    return () => {
      // Unregistration is identity-guarded in the store transition (R-05).
      commandStore.store.trigger.groupUnregistered({ group: registered });
    };
  }, [
    group.id,
    group.prefix,
    group.title,
    group.description,
    group.icon,
    group.order,
    commandStore,
    leaderKey,
  ]);
}

let nextContextSourceId = 0;

export function useProvideCommandContext(getter: () => Partial<CommandContext>): void {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useProvideCommandContext must be used within a CommandProvider");
  }

  const idRef = useRef<string | null>(null);
  if (idRef.current === null) {
    idRef.current = `ctx-${nextContextSourceId++}`;
  }

  const getterRef = useRef(getter);
  getterRef.current = getter;

  const { commandStore } = ctx;

  useEffect(() => {
    const id = idRef.current!;
    commandStore.store.trigger.contextSourceRegistered({
      getter: () => getterRef.current(),
      id,
    });
    return () => {
      commandStore.store.trigger.contextSourceUnregistered({ id });
    };
  }, [commandStore]);
}

export function useProvideCommandContextKey<K extends keyof CommandContext>(
  key: K,
  getter: () => CommandContext[K],
): void {
  useProvideCommandContext(() => ({ [key]: getter() }) as Pick<CommandContext, K>);
}
