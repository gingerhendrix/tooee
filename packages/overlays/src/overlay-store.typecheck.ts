/**
 * Compile-time regression tests for the overlay store's event typing. This
 * module has no runtime behaviour and is never imported; it exists so that
 * `tsc -b` (which only checks `src/`) fails if the store's typing is ever
 * loosened.
 *
 * The store's event/emitted payload maps (`OverlayStoreEvents`, the emitted map
 * inside `overlay-store.ts`) are deliberately CLOSED — no index signatures. That
 * makes unknown `store.trigger.*`, `store.send`, `store.on(...)`, and
 * `enqueue.emit.*` event names compile errors.
 *
 * Unknown names are pinned as TYPE-LEVEL assertions rather than
 * `@ts-expect-error`-ed calls: writing `store.trigger.bogusEvent({})` is an
 * unsafe call on an error-typed value, which is exactly what the lint gate
 * should reject. Asserting on the key sets proves the same property without
 * invalid executable syntax. If one of the `Assert<...>` lines below stops
 * compiling, the maps have been widened (e.g. an index signature was added);
 * fix the maps, not this file.
 */
import type { OverlayCloseReason } from "./overlay-context.js";
import { overlayValue } from "./overlay-context.js";
import { createOverlayStore } from "./overlay-store.js";
import type { OverlayRecord, OverlayStore } from "./overlay-store.js";

declare const record: OverlayRecord;
declare const reason: OverlayCloseReason;

// --- Type-level assertion helpers -------------------------------------------

type Assert<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;
type Has<TKeys, TName> = [Extract<TKeys, TName>] extends [never] ? false : true;

type TriggerNames = keyof OverlayStore["trigger"];
type SendNames = Parameters<OverlayStore["send"]>[0]["type"];
type EmittedNames = Parameters<OverlayStore["on"]>[0];

// --- Known event names must be present --------------------------------------

type KnownTriggers = Assert<Has<TriggerNames, "opened" | "updated" | "closed" | "closedTop">>;
type KnownSends = Assert<Has<SendNames, "opened" | "updated" | "closed" | "closedTop">>;
type KnownEmits = Assert<Has<EmittedNames, "closed">>;

// --- Unknown event names must NOT exist in the maps --------------------------

type UnknownTriggerRejected = Assert<IsNever<Extract<TriggerNames, "bogusEvent">>>;
type UnknownSendRejected = Assert<IsNever<Extract<SendNames, "bogusEvent">>>;
type UnknownEmitRejected = Assert<IsNever<Extract<EmittedNames, "bogusEmit">>>;

export type OverlayStoreEventNameChecks = [
  KnownTriggers,
  KnownSends,
  KnownEmits,
  UnknownTriggerRejected,
  UnknownSendRejected,
  UnknownEmitRejected,
];

// Never called; exists only to be typechecked.
export const overlayStoreTypeChecks = function overlayStoreTypeChecks(): void {
  const store = createOverlayStore();

  // --- Valid usage must compile -------------------------------------------
  store.trigger.opened({ record });
  // The store's payloads are erased to `unknown`, and `OverlayUpdate<T>` is
  // invariant in T (the updater arm consumes T), so direct store callers erase
  // explicitly. Typed callers go through the shell adapter.
  store.trigger.updated({ id: "x", next: overlayValue<unknown>(null) });
  store.trigger.closed({ id: "x", reason });
  store.trigger.closedTop({ reason });
  store.send({ reason, type: "closedTop" });
  store.on("closed", (emitted) => {
    const {
      reason: closeReason,
      restoreModeTo,
      record: closedRecord,
    }: {
      reason: OverlayCloseReason;
      restoreModeTo: string | null;
      record: OverlayRecord;
    } = emitted;
    void closeReason;
    void restoreModeTo;
    void closedRecord;
  });

  // --- Unknown event names must NOT compile --------------------------------
  // (trigger names are covered by the type-level assertions above)
  // @ts-expect-error unknown send event type
  store.send({ type: "bogusEvent" });
  // @ts-expect-error unknown emitted event name
  store.on("bogusEmit", () => void 0);

  // --- Wrong payloads must NOT compile --------------------------------------
  // @ts-expect-error reason must be an OverlayCloseReason
  store.trigger.closedTop({ reason: 42 });
  // @ts-expect-error record is required
  store.trigger.opened({});
  // @ts-expect-error a bare value is not an OverlayUpdate (value/updater must be explicit)
  store.trigger.updated({ id: "x", next: "raw-payload" });
};
