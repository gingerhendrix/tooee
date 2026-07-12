import { createStore } from "@xstate/store";
import type {
  OverlayCloseReason,
  OverlayId,
  OverlayOpenOptions,
  OverlayRenderer,
} from "./overlay-context.js";

/**
 * An overlay stack entry as tracked by the store. `prevMode` is the host mode
 * captured at open time (mode itself stays outside this package — see the
 * shell's OverlayProvider, which owns all mode side effects).
 */
export interface OverlayRecord<TPayload = unknown> {
  id: OverlayId;
  render: OverlayRenderer<TPayload>;
  payload: TPayload;
  options: OverlayOpenOptions;
  prevMode: string;
}

export interface OverlayStoreContext {
  stack: readonly OverlayRecord[];
}

/**
 * Emitted when a record leaves the stack (close, closeTop, or same-id
 * replacement). Lifecycle side effects (onClose callbacks, mode restoration,
 * sequence-reset bridges) are performed by the adapter subscribed via
 * `store.on("closed", ...)`; transitions stay pure.
 */
export interface OverlayClosedEmit {
  record: OverlayRecord;
  reason: OverlayCloseReason;
  /**
   * Legacy mode restoration decision, computed in the transition (it needs
   * stack state): `record.prevMode` when the record is non-ownCommands,
   * `restoreMode !== false`, AND it was the topmost non-ownCommands entry
   * (closing a buried legacy overlay must not clobber the mode set by the one
   * above it — R-04); otherwise null. Same-id replacement displacement never
   * restores (the successor takes over).
   */
  restoreModeTo: string | null;
}

/**
 * Owned command surfaces keep their mode local; the host mode was never
 * mutated on open, so there is nothing to restore. For legacy entries, only
 * the topmost non-ownCommands overlay owns the host mode.
 */
const restoreModeDecision = function restoreModeDecision(
  stack: readonly OverlayRecord[],
  record: OverlayRecord,
): string | null {
  if (record.options.ownCommands || record.options.restoreMode === false) {
    return null;
  }
  const topLegacy = stack.findLast((entry) => !entry.options.ownCommands);
  return topLegacy === record ? record.prevMode : null;
};

/**
 * Event payload map, passed explicitly as a `createStore` generic
 * (@xstate/store v4 removed the `emits` config; event/emitted types come from
 * generics or `schemas`). Both maps here are deliberately CLOSED — no index
 * signatures — so unknown `store.trigger.*` / `store.send` / `store.on` /
 * `enqueue.emit.*` event names are compile errors (pinned by
 * `overlay-store.typecheck.ts`). The v4 `schemas.emitted` alternative was
 * evaluated and rejected: it gives the same strictness while adding runtime
 * schema objects this store does not need.
 */
export type OverlayStoreEvents = {
  opened: { record: OverlayRecord };
  updated: { id: OverlayId; next: unknown | ((prev: unknown) => unknown) };
  closed: { id: OverlayId; reason: OverlayCloseReason };
  closedTop: { reason: OverlayCloseReason };
};

/** Emitted payload map (see OverlayStoreEvents docs — deliberately closed). */
type OverlayStoreEmitted = {
  closed: OverlayClosedEmit;
};

export const createOverlayStore = function createOverlayStore() {
  return createStore<OverlayStoreContext, OverlayStoreEvents, OverlayStoreEmitted>({
    context: { stack: [] },
    on: {
      closed: (ctx, event, enqueue) => {
        const record = ctx.stack.find((entry) => entry.id === event.id);
        if (!record) {
          return ctx;
        }
        enqueue.emit.closed({
          reason: event.reason,
          record,
          restoreModeTo: restoreModeDecision(ctx.stack, record),
        });
        return { stack: ctx.stack.filter((entry) => entry !== record) };
      },
      closedTop: (ctx, event, enqueue) => {
        if (ctx.stack.length === 0) {
          return ctx;
        }
        const record = ctx.stack[ctx.stack.length - 1]!;
        enqueue.emit.closed({
          reason: event.reason,
          record,
          restoreModeTo: restoreModeDecision(ctx.stack, record),
        });
        return { stack: ctx.stack.slice(0, -1) };
      },
      opened: (ctx, event, enqueue) => {
        // Replacing an existing same-id entry closes it: consumers release
        // open-state (e.g. a picker's isOpen) via the contract's "replaced"
        // reason instead of the entry being silently filtered away.
        const displaced = ctx.stack.find((entry) => entry.id === event.record.id);
        if (displaced) {
          enqueue.emit.closed({ reason: "replaced", record: displaced, restoreModeTo: null });
        }
        const filtered = displaced
          ? ctx.stack.filter((entry) => entry.id !== event.record.id)
          : ctx.stack;
        return { stack: [...filtered, event.record] };
      },
      updated: (ctx, event) => {
        const idx = ctx.stack.findIndex((entry) => entry.id === event.id);
        if (idx === -1) {
          return ctx;
        }
        const record = ctx.stack[idx]!;
        const payload =
          typeof event.next === "function"
            ? (event.next as (prev: unknown) => unknown)(record.payload)
            : event.next;
        const stack = [...ctx.stack];
        stack[idx] = { ...record, payload };
        return { stack };
      },
    },
  });
};

export type OverlayStore = ReturnType<typeof createOverlayStore>;

// --- Selectors ---------------------------------------------------------------

export const selectStack = function selectStack(
  ctx: OverlayStoreContext,
): readonly OverlayRecord[] {
  return ctx.stack;
};

export const selectTop = function selectTop(ctx: OverlayStoreContext): OverlayRecord | null {
  return ctx.stack.length > 0 ? ctx.stack[ctx.stack.length - 1]! : null;
};

export const selectHasOverlay = function selectHasOverlay(ctx: OverlayStoreContext): boolean {
  return ctx.stack.length > 0;
};

export const selectIsOpen = function selectIsOpen(
  ctx: OverlayStoreContext,
  id: OverlayId,
): boolean {
  return ctx.stack.some((entry) => entry.id === id);
};

/** Fresh array; prefer selectStack identity + memo in render paths. */
export const selectStackIds = function selectStackIds(
  ctx: OverlayStoreContext,
): readonly OverlayId[] {
  return ctx.stack.map((entry) => entry.id);
};
