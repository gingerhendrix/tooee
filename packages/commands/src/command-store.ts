import { createStore } from "@xstate/store";
import type {
  Command,
  CommandContext,
  CommandSequenceState,
  CommandSurfaceRole,
  ParsedStep,
  RegisteredCommandGroup,
} from "./types.js";
import type { Mode } from "./mode.js";

export const ROOT_SURFACE_ID = "__root";

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
  /**
   * For `panel` surfaces: the id of the owning panel group. A panel surface
   * arbitrates as active only when `activePanels.get(groupId) === id`. Ignored
   * for other roles.
   */
  groupId?: string;
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
  /**
   * The active panel id per panel-group id. A panel group publishes its active
   * panel here (see `panelActivated`); arbitration reads it to pick the active
   * panel surface. Keyed by group id so nested groups are representable.
   */
  activePanels: ReadonlyMap<string, string>;
  /** Renderable pending-sequence display state (which-key input). */
  sequence: CommandSequenceState | null;
}

// --- Selectors ---------------------------------------------------------------

/**
 * The topmost modal surface: role === "modal", max depth, then max order.
 * Passive surfaces and the root never win.
 */
export const selectActiveModalSurface = function selectActiveModalSurface(
  ctx: CommandStoreContext,
): SurfaceRecord | null {
  let best: SurfaceRecord | null = null;
  for (const record of ctx.surfaces) {
    if (record.role !== "modal") {
      continue;
    }
    if (
      best === null ||
      record.depth > best.depth ||
      (record.depth === best.depth && record.order > best.order)
    ) {
      best = record;
    }
  }
  return best;
};

/**
 * The active panel surface, or null: a `role === "panel"` record whose id is its
 * group's active id (`activePanels.get(groupId) === id`). Passive/modal/root
 * surfaces never qualify.
 *
 * When several groups are active (nested panels), the deepest active panel wins
 * (order breaks depth ties) — the innermost link of the active chain. v1 tests
 * exercise a single group; the map-per-group shape keeps nesting representable
 * at no cost, and this heuristic resolves the innermost active panel for any
 * well-formed nesting (an inner group mounted inside its outer group's active
 * panel). Panels never win via depth/order against a *modal* surface — modal
 * arbitration is a separate, earlier step (I-5).
 */
export const selectActivePanelSurface = function selectActivePanelSurface(
  ctx: CommandStoreContext,
): SurfaceRecord | null {
  let best: SurfaceRecord | null = null;
  for (const record of ctx.surfaces) {
    if (record.role !== "panel" || record.groupId === undefined) {
      continue;
    }
    if (ctx.activePanels.get(record.groupId) !== record.id) {
      continue;
    }
    if (
      best === null ||
      record.depth > best.depth ||
      (record.depth === best.depth && record.order > best.order)
    ) {
      best = record;
    }
  }
  return best;
};

/**
 * The surface that currently owns keyboard input, or null when the root app
 * owns it: topmost modal → active panel → null. Mirrors the non-root part of
 * key-dispatch arbitration and is used both to reconcile the sequence buffer
 * across ownership changes and to back the surface-aware hooks.
 */
export const selectKeyboardOwnerSurface = function selectKeyboardOwnerSurface(
  ctx: CommandStoreContext,
): SurfaceRecord | null {
  return selectActiveModalSurface(ctx) ?? selectActivePanelSurface(ctx);
};

/**
 * Commands registered on a surface. Returns a fresh array; memoize against
 * `selectSurfaceCommandMap` identity in render paths.
 */
export const selectSurfaceCommands = function selectSurfaceCommands(
  ctx: CommandStoreContext,
  surfaceId: string,
): readonly Command[] {
  const commands = ctx.commandsBySurface.get(surfaceId);
  return commands ? [...commands.values()] : [];
};

/** Identity-stable per-surface command map (undefined when none registered). */
export const selectSurfaceCommandMap = function selectSurfaceCommandMap(
  ctx: CommandStoreContext,
  surfaceId: string,
): ReadonlyMap<string, Command> | undefined {
  return ctx.commandsBySurface.get(surfaceId);
};

export const selectSequence = function selectSequence(
  ctx: CommandStoreContext,
): CommandSequenceState | null {
  return ctx.sequence;
};

export const selectGroups = function selectGroups(
  ctx: CommandStoreContext,
): ReadonlyMap<string, RegisteredCommandGroup> {
  return ctx.groups;
};

// --- Step-key helpers (shared by key dispatch and group registration) --------

export const formatStepKey = function formatStepKey(step: ParsedStep): string {
  const modifiers = [];
  if (step.ctrl) {
    modifiers.push("ctrl");
  }
  if (step.meta) {
    modifiers.push("meta");
  }
  if (step.option) {
    modifiers.push("option");
  }
  if (step.shift) {
    modifiers.push("shift");
  }
  if (step.super === true) {
    modifiers.push("super");
  }
  modifiers.push(step.key);
  return modifiers.join("+");
};

export const stepsKey = function stepsKey(steps: readonly ParsedStep[]): string {
  return steps.map(formatStepKey).join(" ");
};

// --- Store -------------------------------------------------------------------

/**
 * Sequence-clear rule for surface/activation transitions: a pending chord
 * (display state) is cleared exactly when the transition changes which surface
 * record owns keyboard input — where ownership is `selectKeyboardOwnerSurface`
 * (topmost modal → active panel → root). Pushing/popping a passive surface
 * (e.g. which-key) keeps the sequence it is displaying; replacing the active
 * surface with a same-id record clears it (F-09) because the record identity
 * changes; activating a different panel clears it because the owner record
 * changes.
 */
const sequenceAfterStackChange = function sequenceAfterStackChange(
  before: SurfaceRecord | null,
  after: SurfaceRecord | null,
  sequence: CommandSequenceState | null,
): CommandSequenceState | null {
  return before === after ? sequence : null;
};

export const createBaseStore = function createBaseStore(initialContext: CommandStoreContext) {
  return createStore({
    context: initialContext,
    on: {
      commandRegistered: (
        ctx: CommandStoreContext,
        event: { surfaceId: string; command: Command },
      ): CommandStoreContext => {
        const existing = ctx.commandsBySurface.get(event.surfaceId);
        // Map construction replays entries in order, so a re-registered id keeps its
        // original insertion position and takes the new value — identical to
        // clone-then-set. Pinned by the duplicate-id ordering tests.
        const commands = new Map([...(existing ?? []), [event.command.id, event.command] as const]);
        const commandsBySurface = new Map([
          ...ctx.commandsBySurface,
          [event.surfaceId, commands] as const,
        ]);
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
        if (!existing || existing.get(event.command.id) !== event.command) {
          return ctx;
        }
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
        const contextSources = new Map([...ctx.contextSources, [event.id, event.getter] as const]);
        return { ...ctx, contextSources };
      },
      contextSourceUnregistered: (
        ctx: CommandStoreContext,
        event: { id: string },
      ): CommandStoreContext => {
        if (!ctx.contextSources.has(event.id)) {
          return ctx;
        }
        const contextSources = new Map(ctx.contextSources);
        contextSources.delete(event.id);
        return { ...ctx, contextSources };
      },
      groupRegistered: (
        ctx: CommandStoreContext,
        event: { group: RegisteredCommandGroup },
      ): CommandStoreContext => {
        const groups = new Map([...ctx.groups, [event.group.prefixKey, event.group] as const]);
        return { ...ctx, groups };
      },
      groupUnregistered: (
        ctx: CommandStoreContext,
        event: { group: RegisteredCommandGroup },
      ): CommandStoreContext => {
        // Identity-guarded, as for commands.
        if (ctx.groups.get(event.group.prefixKey) !== event.group) {
          return ctx;
        }
        const groups = new Map(ctx.groups);
        groups.delete(event.group.prefixKey);
        return { ...ctx, groups };
      },
      modeChanged: (ctx: CommandStoreContext, _event: { surfaceId: string }): CommandStoreContext =>
        // A mode change is a transition, not a post-render repair: any pending
        // chord is invalidated (F-08 — including surface-local mode changes).
        ctx.sequence === null ? ctx : { ...ctx, sequence: null },
      panelActivated: (
        ctx: CommandStoreContext,
        event: { groupId: string; panelId: string },
      ): CommandStoreContext => {
        if (ctx.activePanels.get(event.groupId) === event.panelId) {
          return ctx;
        }
        const before = selectKeyboardOwnerSurface(ctx);
        const activePanels = new Map([
          ...ctx.activePanels,
          [event.groupId, event.panelId] as const,
        ]);
        const after = selectKeyboardOwnerSurface({ ...ctx, activePanels });
        return {
          ...ctx,
          activePanels,
          sequence: sequenceAfterStackChange(before, after, ctx.sequence),
        };
      },
      panelGroupRemoved: (
        ctx: CommandStoreContext,
        event: { groupId: string },
      ): CommandStoreContext => {
        if (!ctx.activePanels.has(event.groupId)) {
          return ctx;
        }
        const before = selectKeyboardOwnerSurface(ctx);
        const activePanels = new Map(ctx.activePanels);
        activePanels.delete(event.groupId);
        const after = selectKeyboardOwnerSurface({ ...ctx, activePanels });
        return {
          ...ctx,
          activePanels,
          sequence: sequenceAfterStackChange(before, after, ctx.sequence),
        };
      },
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
        if (surfaces.length === ctx.surfaces.length) {
          return ctx;
        }
        const before = selectKeyboardOwnerSurface(ctx);
        const after = selectKeyboardOwnerSurface({ ...ctx, surfaces });
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
        const before = selectKeyboardOwnerSurface(ctx);
        const surfaces = [...ctx.surfaces, event.surface];
        const after = selectKeyboardOwnerSurface({ ...ctx, surfaces });
        return {
          ...ctx,
          sequence: sequenceAfterStackChange(before, after, ctx.sequence),
          surfaces,
        };
      },
    },
  });
};

export type CommandStoreInstance = ReturnType<typeof createBaseStore>;
