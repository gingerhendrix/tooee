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
  selectActivePanelSurface,
  selectKeyboardOwnerSurface,
  selectSequence,
  selectSurfaceCommandMap,
  stepsKey,
} from "./command-store.js";
import type { CommandStore, ContextGetter, SurfaceRecord } from "./command-store.js";
import { buildCommandContext, commandsFromRegistry } from "./build-context.js";

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
 * Placeholder context used before the dispatcher installs the real accessors,
 * and by the fallback store. It has no context sources, so it carries only the
 * core fields; dispatch never reaches it.
 */
const placeholderCommandContext = function placeholderCommandContext(mode: Mode): CommandContext {
  return buildCommandContext({
    commands: { invoke: () => void 0, list: () => [] },
    mode,
    setMode: () => void 0,
  });
};

/**
 * Fallback store for hooks that must not throw outside a CommandProvider
 * (useActiveCommandSurface, useSurfaceCommands). Never dispatched to.
 */
const FALLBACK_COMMAND_STORE = createCommandStore({
  root: {
    buildCtx: () => placeholderCommandContext("cursor"),
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

export const CommandProvider = function CommandProvider({
  children,
  leader,
  keymap,
  initialMode,
  sequenceTimeoutMs,
}: CommandProviderProps): ReactNode {
  // The store is created here (above the root ModeProvider) so mode changes
  // can be routed into it as transitions; the dispatcher below installs the
  // real root accessors before any key can dispatch.
  const rootAccessRef = useRef<RootAccess>({
    // Placeholder until CommandDispatcher installs the real accessors on its
    // first render (before any key can dispatch).
    buildCtx: () => placeholderCommandContext(initialMode ?? "cursor"),
    getMode: () => initialMode ?? "cursor",
  });

  const storeRef = useRef<CommandStore | null>(null);
  storeRef.current ??= createCommandStore({
    keymap,
    leader,
    root: {
      buildCtx: () => rootAccessRef.current.buildCtx(),
      getMode: () => rootAccessRef.current.getMode(),
    },
    sequenceTimeoutMs,
  });
  const commandStore = storeRef.current;

  // Root mode changes are transitions: reset any pending chord synchronously
  // (this replaces the old post-render tracker-reset effect).
  const handleModeChange = useCallback(() => {
    commandStore.modeChanged(ROOT_SURFACE_ID);
  }, [commandStore]);

  return (
    <ModeProvider initialMode={initialMode} onModeChange={handleModeChange}>
      {/* oxlint-disable-next-line no-use-before-define -- dispatcher is deliberately declared below provider */}
      <CommandDispatcher
        commandStore={commandStore}
        rootAccess={rootAccessRef}
        leader={leader}
        keymap={keymap}
        sequenceTimeoutMs={sequenceTimeoutMs}
      >
        {children}
        {/* oxlint-disable-next-line no-use-before-define -- closing dispatcher declaration is below provider */}
      </CommandDispatcher>
    </ModeProvider>
  );
};

// Deferred(lint-sweep): preserve the top-down provider/dispatcher organization.
// oxlint-disable-next-line no-use-before-define -- provider deliberately renders its dispatcher below
const CommandDispatcher = function CommandDispatcher({
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
}): ReactNode {
  const mode = useMode();
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const setMode = useSetMode();

  const buildCtx = useCallback(
    (): CommandContext =>
      buildCommandContext({
        commands: commandsFromRegistry(commandStore.registryFor(commandStore.rootRecord)),
        contributions: commandStore.store.getSnapshot().context.contextSources.values(),
        mode: modeRef.current,
        setMode,
      }),
    [commandStore, setMode],
  );

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
  useEffect(
    () => () => {
      commandStore.dispose();
    },
    [commandStore],
  );

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
};

export interface CommandSurfaceProviderProps {
  children: ReactNode;
  /** Stable id for the surface (typically the overlay id). */
  id: string;
  /** Interaction role (default "modal"). */
  role?: CommandSurfaceRole;
  /**
   * For `role: "panel"` surfaces: the owning panel group's id. The surface only
   * arbitrates as active while `activePanels.get(groupId) === id`. Ignored for
   * other roles. Set by `@tooee/panels`'s `Panel`.
   */
  groupId?: string;
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
export const CommandSurfaceProvider = function CommandSurfaceProvider({
  children,
  id,
  role = "modal",
  groupId,
  initialMode = "cursor",
}: CommandSurfaceProviderProps): ReactNode {
  const parent = useContext(CommandContext);
  if (!parent) {
    throw new Error("CommandSurfaceProvider must be used within a CommandProvider");
  }
  const { commandStore } = parent;

  // Surface-local mode changes are transitions too (F-08): a mid-chord mode
  // switch on a modal surface resets the pending sequence.
  const handleModeChange = useCallback(() => {
    commandStore.modeChanged(id);
  }, [commandStore, id]);

  return (
    <ModeProvider initialMode={initialMode} onModeChange={handleModeChange}>
      {/* Deferred(lint-sweep): preserve top-down provider/wrapper organization. */}
      {/* oxlint-disable-next-line no-use-before-define -- inner surface is deliberately declared below */}
      <CommandSurfaceInner id={id} role={role} groupId={groupId}>
        {children}
        {/* oxlint-disable-next-line no-use-before-define -- closing inner surface declaration is below provider */}
      </CommandSurfaceInner>
    </ModeProvider>
  );
};

const CommandSurfaceInner = function CommandSurfaceInner({
  children,
  id,
  role,
  groupId,
}: {
  children: ReactNode;
  id: string;
  role: CommandSurfaceRole;
  groupId?: string;
}): ReactNode {
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
    // Deferred(lint-sweep): replace this lifecycle ref with an API that models render-time initialization.
    // oxlint-disable-next-line typescript/no-non-null-assertion, no-use-before-define -- initialized lifecycle ref intentionally captured by closure
    const registry = commandStore.registryFor(recordRef.current!);
    return buildCommandContext({
      commands: commandsFromRegistry(registry),
      contributions: commandStore.store.getSnapshot().context.contextSources.values(),
      mode: modeRef.current,
      setMode,
    });
  }, [commandStore, setMode]);

  const buildCtxRef = useRef(buildCtx);
  buildCtxRef.current = buildCtx;

  const recordRef = useRef<SurfaceRecord | null>(null);
  if (
    recordRef.current === null ||
    recordRef.current.id !== id ||
    recordRef.current.role !== role ||
    recordRef.current.depth !== depth ||
    recordRef.current.groupId !== groupId
  ) {
    recordRef.current = {
      buildCtx: () => buildCtxRef.current(),
      depth,
      getMode: () => modeRef.current,
      groupId,
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
};

export const useCommandContext = function useCommandContext(): {
  commands: Command[];
  invoke: (id: string) => void;
} {
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
      commands: commandMap ? [...commandMap.values()] : [],
      invoke: registry.invoke,
    }),
    [commandMap, registry],
  );
};

/**
 * Builds the live command context of the nearest surface — the same value
 * command handlers receive. For callers that must hand a context to something
 * outside the dispatch path (e.g. a context-menu entry resolver).
 */
export const useBuildCommandContext = function useBuildCommandContext(): () => CommandContext {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useBuildCommandContext must be used within a CommandProvider");
  }
  const { surface } = ctx;
  return useCallback(() => surface.buildCtx(), [surface]);
};

/**
 * Internal: the stable registry facade for the nearest surface, without
 * subscribing to store changes. Registration hooks (useCommand/useActions)
 * only need the facade; subscribing them would re-render every command host
 * on unrelated group/context-source registrations.
 */
export const useSurfaceRegistry = function useSurfaceRegistry(): CommandRegistry {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandRegistry must be used within a CommandProvider");
  }
  return ctx.commandStore.registryFor(ctx.surface);
};

export const useCommandRegistry = function useCommandRegistry(): CommandContextValue {
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
      // Deferred(lint-sweep): expose readonly store maps through an immutable registry API.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- compatibility facade preserves the existing mutable Map API
      contextSources: contextSources as Map<string, ContextGetter>,
      // Deferred(lint-sweep): expose readonly store maps through an immutable registry API.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- compatibility facade preserves the existing mutable Map API
      groups: groups as Map<string, RegisteredCommandGroup>,
      leaderKey,
      registry,
    }),
    [registry, leaderKey, contextSources, groups],
  );
};

export const useCommandSequenceState =
  function useCommandSequenceState(): CommandSequenceState | null {
    return useContext(CommandSequenceContext);
  };

/**
 * Id of the command surface this subtree registers commands to: the nearest
 * enclosing `CommandSurfaceProvider`'s id, or `ROOT_SURFACE_ID` at the app
 * root. Compare against `useActiveCommandSurface()` to tell whether another
 * modal surface currently owns keyboard input above this subtree.
 */
export const useCommandSurfaceId = function useCommandSurfaceId(): string {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandSurfaceId must be used within a CommandProvider");
  }
  return ctx.surface.id;
};

/**
 * Metadata for the surface that currently owns keyboard input — the topmost
 * modal surface, else the active panel, else null when the root app owns it.
 * Intended for which-key/help to read shortcuts from the active interaction
 * surface, and used as a suspension guard by contained editors (a surface whose
 * id differs from the owner is suspended). `commands` is reactive (F-13).
 */
export const useActiveCommandSurface =
  function useActiveCommandSurface(): ActiveCommandSurface | null {
    const ctx = useContext(CommandContext);
    const { store } = ctx?.commandStore ?? FALLBACK_COMMAND_STORE;

    const record = useSelector(store, (s) => selectKeyboardOwnerSurface(s.context));
    const commandMap = useSelector(store, (s) => {
      const active = selectKeyboardOwnerSurface(s.context);
      return active ? selectSurfaceCommandMap(s.context, active.id) : undefined;
    });

    return useMemo(() => {
      if (!record) {
        return null;
      }
      return {
        commands: commandMap ? [...commandMap.values()] : [],
        id: record.id,
        // Deferred(lint-sweep): model selector records with the public surface-role type.
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- selector record is trusted store data
        role: record.role as CommandSurfaceRole,
      };
    }, [record, commandMap]);
  };

/**
 * Commands registered on a surface (reactive). Defaults to the keyboard-owner
 * surface (topmost modal, else active panel), falling back to the root surface
 * when none is active.
 */
export const useSurfaceCommands = function useSurfaceCommands(
  surfaceId?: string,
): readonly Command[] {
  const ctx = useContext(CommandContext);
  const { store } = ctx?.commandStore ?? FALLBACK_COMMAND_STORE;

  const commandMap = useSelector(store, (s) => {
    const id = surfaceId ?? selectKeyboardOwnerSurface(s.context)?.id ?? ROOT_SURFACE_ID;
    return selectSurfaceCommandMap(s.context, id);
  });

  return useMemo(() => (commandMap ? [...commandMap.values()] : []), [commandMap]);
};

export interface EffectiveCommands {
  /** Commands invocable from the current context, active-panel first. */
  commands: Command[];
  /** Invoke by id, routed to the surface that owns the command (panel, else root). */
  invoke: (id: string) => void;
}

/**
 * The command set a palette should present under panel fall-through: the active
 * panel's commands plus the root's, mirroring dispatch. When a panel is active,
 * a root command whose hotkey the panel shadows keeps its palette entry (still
 * invocable there) but drops the now-misleading hotkey hint. With no active
 * panel this is exactly the root command set, so non-panel apps are unchanged.
 *
 * Shadowing is computed on `defaultHotkey` — matching what the palette renders —
 * so a `keymap`-remapped shadow is not reflected in the hint (a display-only
 * edge; dispatch itself shadows correctly via the store).
 */
export const useEffectiveCommands = function useEffectiveCommands(): EffectiveCommands {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useEffectiveCommands must be used within a CommandProvider");
  }
  const { commandStore } = ctx;
  const { store } = commandStore;

  const panelMap = useSelector(store, (s) => {
    const panel = selectActivePanelSurface(s.context);
    return panel ? selectSurfaceCommandMap(s.context, panel.id) : undefined;
  });
  const rootMap = useSelector(store, (s) => selectSurfaceCommandMap(s.context, ROOT_SURFACE_ID));
  const hasPanel = useSelector(store, (s) => selectActivePanelSurface(s.context) !== null);

  return useMemo(() => {
    const rootCommands = rootMap ? [...rootMap.values()] : [];
    const rootInvoke = (id: string): void => {
      commandStore.registryFor(commandStore.rootRecord).invoke(id);
    };
    if (!hasPanel) {
      return { commands: rootCommands, invoke: rootInvoke };
    }

    const panelCommands = panelMap ? [...panelMap.values()] : [];
    const panelIds = new Set(panelCommands.map((command) => command.id));
    const shadowed = new Set(
      panelCommands
        .map((command) => command.defaultHotkey)
        .filter((hotkey): hotkey is string => hotkey !== undefined && hotkey !== ""),
    );
    const effectiveRoot = rootCommands
      .filter((command) => !panelIds.has(command.id))
      .map((command) =>
        command.defaultHotkey !== undefined && shadowed.has(command.defaultHotkey)
          ? { ...command, defaultHotkey: undefined }
          : command,
      );

    const invoke = (id: string): void => {
      if (panelIds.has(id)) {
        const panel = selectActivePanelSurface(store.getSnapshot().context);
        if (panel) {
          commandStore.registryFor(panel).invoke(id);
          return;
        }
      }
      rootInvoke(id);
    };

    return { commands: [...panelCommands, ...effectiveRoot], invoke };
  }, [panelMap, rootMap, hasPanel, commandStore, store]);
};

/**
 * Advanced/internal — subject to change. The command store instance backing
 * this provider tree, for bridges that must reach the dispatch machinery
 * (e.g. the shell's overlay-replacement sequence reset).
 */
export const useCommandStore = function useCommandStore(): CommandStore {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useCommandStore must be used within a CommandProvider");
  }
  return ctx.commandStore;
};

export const useCommandGroup = function useCommandGroup(group: CommandGroup): void {
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
};

let nextContextSourceId = 0;

export const useProvideCommandContext = function useProvideCommandContext(
  getter: () => Partial<CommandContext>,
): void {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("useProvideCommandContext must be used within a CommandProvider");
  }

  const idRef = useRef<string | null>(null);
  if (idRef.current === null) {
    idRef.current = `ctx-${nextContextSourceId}`;
    nextContextSourceId += 1;
  }

  const getterRef = useRef(getter);
  getterRef.current = getter;

  const { commandStore } = ctx;

  useEffect(() => {
    // Deferred(lint-sweep): replace nullable ref bookkeeping with an API that returns the initialized id.
    // oxlint-disable-next-line typescript/no-non-null-assertion -- idRef is initialized in the render immediately above
    const id = idRef.current!;
    commandStore.store.trigger.contextSourceRegistered({
      getter: () => getterRef.current(),
      id,
    });
    return () => {
      commandStore.store.trigger.contextSourceUnregistered({ id });
    };
  }, [commandStore]);
};

export const useProvideCommandContextKey = function useProvideCommandContextKey<
  K extends keyof CommandContext,
>(key: K, getter: () => CommandContext[K]): void {
  // Deferred(lint-sweep): provide a typed augmentation builder instead of asserting computed keys.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- computed key is constrained by K
  useProvideCommandContext(() => ({ [key]: getter() }));
};
