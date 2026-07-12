import { createStore } from "@xstate/store";
import type { KeyEvent } from "@opentui/core";
import type {
  Command,
  CommandContext,
  CommandRegistry,
  CommandSequenceState,
  CommandSurfaceRole,
  ParsedHotkey,
  ParsedStep,
  RegisteredCommandGroup,
} from "./types.js";
import type { Mode } from "./mode.js";
import { parseHotkey } from "./parse.js";
import { matchStep } from "./match.js";
import {
  DEFAULT_SEQUENCE_TIMEOUT_MS,
  findPendingMatch,
  matchesBuffer,
  pruneBuffer,
} from "./sequence.js";

export const ROOT_SURFACE_ID = "__root";

const DEFAULT_MODES: Mode[] = ["cursor"];

/**
 * A surface as tracked by the store. The root app is `surfaces[0]`, always
 * present, with role `"root"` — it never arbitrates as modal.
 *
 * Commands are NOT stored on the record: React mounts children (whose
 * `useCommand` effects register commands) before the surface's own register
 * effect pushes the record, and unmount cleanup pops the record before the
 * children unregister. Per-surface command maps therefore live in
 * `commandsBySurface`, keyed by surface id, independent of the stack.
 */
export interface SurfaceRecord {
  id: string;
  role: CommandSurfaceRole | "root";
  /** Nesting depth (root = 0). */
  depth: number;
  /** Monotonic registration order (tie-break), assigned by the wrapper on push. */
  order: number;
  /** Reads this surface's current local mode (mode stays in ModeProvider React state). */
  getMode: () => Mode;
  /** Builds the command context handed to this surface's handlers. */
  buildCtx: () => CommandContext;
}

export type ContextGetter = () => Partial<CommandContext>;

export interface CommandStoreContext {
  /** Surface stack ordered by registration; `surfaces[0]` is the root record. */
  surfaces: readonly SurfaceRecord[];
  /** Per-surface command maps, keyed by surface id (see SurfaceRecord docs). */
  commandsBySurface: ReadonlyMap<string, ReadonlyMap<string, Command>>;
  /** Command groups keyed by prefixKey. */
  groups: ReadonlyMap<string, RegisteredCommandGroup>;
  contextSources: ReadonlyMap<string, ContextGetter>;
  /** Renderable pending-sequence display state (which-key input). */
  sequence: CommandSequenceState | null;
}

// --- Selectors ---------------------------------------------------------------

/**
 * The topmost modal surface: role === "modal", max depth, then max order.
 * Passive surfaces and the root never win.
 */
export function selectActiveModalSurface(ctx: CommandStoreContext): SurfaceRecord | null {
  let best: SurfaceRecord | null = null;
  for (const record of ctx.surfaces) {
    if (record.role !== "modal") continue;
    if (
      best === null ||
      record.depth > best.depth ||
      (record.depth === best.depth && record.order > best.order)
    ) {
      best = record;
    }
  }
  return best;
}

/**
 * Commands registered on a surface. Returns a fresh array; memoize against
 * `selectSurfaceCommandMap` identity in render paths.
 */
export function selectSurfaceCommands(
  ctx: CommandStoreContext,
  surfaceId: string,
): readonly Command[] {
  const commands = ctx.commandsBySurface.get(surfaceId);
  return commands ? [...commands.values()] : [];
}

/** Identity-stable per-surface command map (undefined when none registered). */
export function selectSurfaceCommandMap(
  ctx: CommandStoreContext,
  surfaceId: string,
): ReadonlyMap<string, Command> | undefined {
  return ctx.commandsBySurface.get(surfaceId);
}

export function selectSequence(ctx: CommandStoreContext): CommandSequenceState | null {
  return ctx.sequence;
}

export function selectGroups(
  ctx: CommandStoreContext,
): ReadonlyMap<string, RegisteredCommandGroup> {
  return ctx.groups;
}

// --- Step-key helpers (shared by key dispatch and group registration) --------

export function formatStepKey(step: ParsedStep): string {
  const modifiers = [];
  if (step.ctrl) modifiers.push("ctrl");
  if (step.meta) modifiers.push("meta");
  if (step.option) modifiers.push("option");
  if (step.shift) modifiers.push("shift");
  if (step.super) modifiers.push("super");
  modifiers.push(step.key);
  return modifiers.join("+");
}

export function stepsKey(steps: readonly ParsedStep[]): string {
  return steps.map(formatStepKey).join(" ");
}

// --- Store -------------------------------------------------------------------

/**
 * Sequence-clear rule for surface transitions: a pending chord (display state)
 * is cleared exactly when the transition changes which surface record owns
 * keyboard input. Pushing/popping a passive surface (e.g. which-key) keeps the
 * sequence it is displaying; replacing the active modal surface with a same-id
 * record clears it (F-09) because the record identity changes.
 */
function sequenceAfterStackChange(
  before: SurfaceRecord | null,
  after: SurfaceRecord | null,
  sequence: CommandSequenceState | null,
): CommandSequenceState | null {
  return before === after ? sequence : null;
}

function createBaseStore(initialContext: CommandStoreContext) {
  return createStore({
    context: initialContext,
    on: {
      commandRegistered: (
        ctx: CommandStoreContext,
        event: { surfaceId: string; command: Command },
      ): CommandStoreContext => {
        const existing = ctx.commandsBySurface.get(event.surfaceId);
        const commands = new Map(existing);
        commands.set(event.command.id, event.command);
        const commandsBySurface = new Map(ctx.commandsBySurface);
        commandsBySurface.set(event.surfaceId, commands);
        return { ...ctx, commandsBySurface };
      },
      commandUnregistered: (
        ctx: CommandStoreContext,
        event: { surfaceId: string; command: Command },
      ): CommandStoreContext => {
        // Identity-guarded (R-05): with duplicate ids the map holds the last
        // writer, and the first registrant's unmount must not delete the
        // second's live command.
        const existing = ctx.commandsBySurface.get(event.surfaceId);
        if (!existing || existing.get(event.command.id) !== event.command) return ctx;
        const commands = new Map(existing);
        commands.delete(event.command.id);
        const commandsBySurface = new Map(ctx.commandsBySurface);
        if (commands.size === 0) {
          commandsBySurface.delete(event.surfaceId);
        } else {
          commandsBySurface.set(event.surfaceId, commands);
        }
        return { ...ctx, commandsBySurface };
      },
      contextSourceRegistered: (
        ctx: CommandStoreContext,
        event: { id: string; getter: ContextGetter },
      ): CommandStoreContext => {
        const contextSources = new Map(ctx.contextSources);
        contextSources.set(event.id, event.getter);
        return { ...ctx, contextSources };
      },
      contextSourceUnregistered: (
        ctx: CommandStoreContext,
        event: { id: string },
      ): CommandStoreContext => {
        if (!ctx.contextSources.has(event.id)) return ctx;
        const contextSources = new Map(ctx.contextSources);
        contextSources.delete(event.id);
        return { ...ctx, contextSources };
      },
      groupRegistered: (
        ctx: CommandStoreContext,
        event: { group: RegisteredCommandGroup },
      ): CommandStoreContext => {
        const groups = new Map(ctx.groups);
        groups.set(event.group.prefixKey, event.group);
        return { ...ctx, groups };
      },
      groupUnregistered: (
        ctx: CommandStoreContext,
        event: { group: RegisteredCommandGroup },
      ): CommandStoreContext => {
        // Identity-guarded, as for commands.
        if (ctx.groups.get(event.group.prefixKey) !== event.group) return ctx;
        const groups = new Map(ctx.groups);
        groups.delete(event.group.prefixKey);
        return { ...ctx, groups };
      },
      modeChanged: (ctx: CommandStoreContext, _event: { surfaceId: string }): CommandStoreContext =>
        // A mode change is a transition, not a post-render repair: any pending
        // chord is invalidated (F-08 — including surface-local mode changes).
        ctx.sequence === null ? ctx : { ...ctx, sequence: null },
      sequencePending: (
        ctx: CommandStoreContext,
        event: { state: CommandSequenceState },
      ): CommandStoreContext => ({ ...ctx, sequence: event.state }),
      sequenceReset: (ctx: CommandStoreContext): CommandStoreContext =>
        ctx.sequence === null ? ctx : { ...ctx, sequence: null },
      surfacePopped: (
        ctx: CommandStoreContext,
        event: { surface: SurfaceRecord },
      ): CommandStoreContext => {
        // Identity-based removal: only the exact pushed record is removed.
        const surfaces = ctx.surfaces.filter((record) => record !== event.surface);
        if (surfaces.length === ctx.surfaces.length) return ctx;
        const before = selectActiveModalSurface(ctx);
        const after = selectActiveModalSurface({ ...ctx, surfaces });
        return {
          ...ctx,
          sequence: sequenceAfterStackChange(before, after, ctx.sequence),
          surfaces,
        };
      },
      surfacePushed: (
        ctx: CommandStoreContext,
        event: { surface: SurfaceRecord },
      ): CommandStoreContext => {
        const before = selectActiveModalSurface(ctx);
        const surfaces = [...ctx.surfaces, event.surface];
        const after = selectActiveModalSurface({ ...ctx, surfaces });
        return {
          ...ctx,
          sequence: sequenceAfterStackChange(before, after, ctx.sequence),
          surfaces,
        };
      },
    },
  });
}

export type CommandStoreInstance = ReturnType<typeof createBaseStore>;

// --- Wrapper -----------------------------------------------------------------

export interface KeyDispatchResult {
  handled: boolean;
  /**
   * Present on a full command match. The caller (the `useKeyboard` effect)
   * calls `preventDefault()` and then `invoke()` synchronously, preserving
   * today's dispatch order and `event.defaultPrevented` semantics.
   */
  invoke?: () => void;
}

export interface CommandStoreConfig {
  leader?: string;
  keymap?: Record<string, string>;
  sequenceTimeoutMs?: number;
}

export interface CreateCommandStoreOptions extends CommandStoreConfig {
  /** Root surface accessors, provided by the command provider/dispatcher. */
  root: { getMode: () => Mode; buildCtx: () => CommandContext };
}

/**
 * The single writer around the store. Owns the two pieces of IO-adjacent,
 * non-render state: the key buffer (not render state — putting it in store
 * context would notify subscribers on every keystroke) and the sequence
 * timeout timer. The renderable `sequence` display state lives in the store.
 */
export interface CommandStore {
  /** The underlying @xstate/store instance (subscribe/getSnapshot/trigger). */
  store: CommandStoreInstance;
  /** The always-present root surface record (`surfaces[0]`). */
  rootRecord: SurfaceRecord;

  /**
   * Feed a key event: arbitrates the active surface, filters candidates by
   * mode/when, runs the pure sequence matchers against the internal buffer,
   * triggers sequencePending/sequenceReset as needed, schedules/clears the
   * timeout, and returns what happened so the caller can preventDefault and
   * invoke synchronously.
   */
  key: (event: KeyEvent) => KeyDispatchResult;

  /** Clears buffer + timer and triggers sequenceReset. Idempotent. */
  reset: () => void;
  /** Clears buffer + timer permanently, without touching store state. Called on dispatcher unmount. */
  dispose: () => void;

  /** Push a surface record; assigns registration order. Returns the pop cleanup. */
  pushSurface: (surface: SurfaceRecord) => () => void;
  /** Notify a (root or surface-local) mode change: clears buffer + pending sequence. */
  modeChanged: (surfaceId: string) => void;

  /** Back-compat CommandRegistry facade for a surface record (stable per record). */
  registryFor: (record: SurfaceRecord) => CommandRegistry;

  /** Update live config (leader/keymap/timeout are read per dispatch, as before). */
  setConfig: (config: CommandStoreConfig) => void;
}

export function createCommandStore(options: CreateCommandStoreOptions): CommandStore {
  const rootRecord: SurfaceRecord = {
    buildCtx: options.root.buildCtx,
    depth: 0,
    getMode: options.root.getMode,
    id: ROOT_SURFACE_ID,
    order: 0,
    role: "root",
  };

  const store = createBaseStore({
    commandsBySurface: new Map(),
    contextSources: new Map(),
    groups: new Map(),
    sequence: null,
    surfaces: [rootRecord],
  });

  let config: CommandStoreConfig = {
    keymap: options.keymap,
    leader: options.leader,
    sequenceTimeoutMs: options.sequenceTimeoutMs,
  };

  // IO-adjacent wrapper state: key buffer, timer, parse cache, order counter.
  let buffer: readonly KeyEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const parseCache = new Map<string, ParsedHotkey>();
  const registries = new Map<SurfaceRecord, CommandRegistry>();
  let orderCounter = 1;

  function clearTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function clearBufferAndTimer(): void {
    buffer = [];
    clearTimer();
  }

  function reset(): void {
    clearBufferAndTimer();
    store.trigger.sequenceReset();
  }

  function armTimer(): void {
    clearTimer();
    timer = setTimeout(reset, config.sequenceTimeoutMs ?? DEFAULT_SEQUENCE_TIMEOUT_MS);
  }

  function dispose(): void {
    clearBufferAndTimer();
  }

  function getParsedHotkey(hotkey: string): ParsedHotkey {
    const cacheKey = `${hotkey}:${config.leader ?? ""}`;
    let parsed = parseCache.get(cacheKey);
    if (!parsed) {
      parsed = parseHotkey(hotkey, config.leader);
      parseCache.set(cacheKey, parsed);
    }
    return parsed;
  }

  function key(event: KeyEvent): KeyDispatchResult {
    const ctx = store.getSnapshot().context;

    // Arbitration: a topmost modal surface owns input; otherwise the root app.
    const surface = selectActiveModalSurface(ctx) ?? rootRecord;
    const currentMode = surface.getMode();
    const cmdCtx = surface.buildCtx();
    const commands = ctx.commandsBySurface.get(surface.id);

    // Collect eligible commands with their parsed hotkeys
    const singleStepCandidates: { command: Command; parsed: ParsedHotkey }[] = [];
    const multiStepCandidates: { command: Command; hotkey: string; parsed: ParsedHotkey }[] = [];

    if (commands) {
      for (const command of commands.values()) {
        const commandModes = command.modes ?? DEFAULT_MODES;
        if (!commandModes.includes(currentMode)) continue;
        if (command.when && !command.when(cmdCtx)) continue;

        const hotkey = config.keymap?.[command.id] ?? command.defaultHotkey;
        if (!hotkey) continue;

        const parsed = getParsedHotkey(hotkey);

        // Unmatchable hotkeys (e.g. <leader> with no configured leader) register
        // nothing rather than matching everything.
        if (parsed.steps.length === 0) continue;

        if (parsed.steps.length === 1) {
          singleStepCandidates.push({ command, parsed });
        } else {
          multiStepCandidates.push({ command, hotkey, parsed });
        }
      }
    }

    // Check multi-step sequences first (they consume buffer state)
    if (multiStepCandidates.length > 0) {
      const hotkeys = multiStepCandidates.map((candidate) => candidate.parsed);
      buffer = [...buffer, event];
      armTimer();

      let matchedIndex = -1;
      for (let i = 0; i < hotkeys.length; i += 1) {
        if (matchesBuffer(buffer, hotkeys[i])) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex >= 0) {
        clearBufferAndTimer();
        store.trigger.sequenceReset();
        const matched = multiStepCandidates[matchedIndex].command;
        return { handled: true, invoke: () => matched.handler(cmdCtx) };
      }

      buffer = pruneBuffer(buffer, hotkeys);
      const pending = findPendingMatch(buffer, hotkeys);

      if (pending) {
        const firstCandidate = multiStepCandidates[pending.indexes[0]];
        const state: CommandSequenceState = {
          candidates: pending.indexes
            .map((idx) => multiStepCandidates[idx])
            .filter(({ command }) => !command.hidden)
            .map(({ command, hotkey, parsed }) => ({
              command,
              group: ctx.groups.get(stepsKey(parsed.steps.slice(0, pending.prefixLength + 1))),
              hotkey,
              nextStep: parsed.steps[pending.prefixLength],
              remainingSteps: parsed.steps.slice(pending.prefixLength),
              steps: parsed.steps,
            })),
          prefix: firstCandidate.parsed.steps.slice(0, pending.prefixLength),
        };
        store.trigger.sequencePending({ state });
        return { handled: true };
      }

      store.trigger.sequenceReset();
    }

    // Check single-step matches
    for (const { command, parsed } of singleStepCandidates) {
      if (matchStep(event, parsed.steps[0])) {
        store.trigger.sequenceReset();
        return { handled: true, invoke: () => command.handler(cmdCtx) };
      }
    }

    // A modal surface swallows unhandled keys: dispatch never falls through to
    // the root app while a modal surface is topmost. (The caller does not
    // preventDefault unmatched keys — same as today.)
    return { handled: false };
  }

  function pushSurface(surface: SurfaceRecord): () => void {
    surface.order = orderCounter;
    orderCounter += 1;
    const before = selectActiveModalSurface(store.getSnapshot().context);
    store.trigger.surfacePushed({ surface });
    const after = selectActiveModalSurface(store.getSnapshot().context);
    // Keep the wrapper buffer consistent with the transition's sequence-clear
    // rule: clear exactly when keyboard ownership changed.
    if (before !== after) clearBufferAndTimer();

    return () => {
      const beforePop = selectActiveModalSurface(store.getSnapshot().context);
      store.trigger.surfacePopped({ surface });
      const afterPop = selectActiveModalSurface(store.getSnapshot().context);
      if (beforePop !== afterPop) clearBufferAndTimer();
    };
  }

  function modeChanged(surfaceId: string): void {
    clearBufferAndTimer();
    store.trigger.modeChanged({ surfaceId });
  }

  function registryFor(record: SurfaceRecord): CommandRegistry {
    let registry = registries.get(record);
    if (!registry) {
      registry = {
        get commands() {
          const current = store.getSnapshot().context.commandsBySurface.get(record.id);
          // The registry contract exposes a Map; the store's per-surface maps
          // are Maps at runtime (readonly-typed). Consumers must not mutate.
          return (current ?? new Map()) as Map<string, Command>;
        },
        invoke(id: string) {
          const ctx = store.getSnapshot().context;
          const cmd = ctx.commandsBySurface.get(record.id)?.get(id);
          if (!cmd) return;
          const cmdCtx = record.buildCtx();
          if (!cmd.when || cmd.when(cmdCtx)) {
            cmd.handler(cmdCtx);
          }
        },
        register(command: Command) {
          store.trigger.commandRegistered({ command, surfaceId: record.id });
          return () => {
            store.trigger.commandUnregistered({ command, surfaceId: record.id });
          };
        },
      };
      registries.set(record, registry);
    }
    return registry;
  }

  function setConfig(next: CommandStoreConfig): void {
    config = next;
  }

  return {
    dispose,
    key,
    modeChanged,
    pushSurface,
    registryFor,
    reset,
    rootRecord,
    setConfig,
    store,
  };
}
