/**
 * Compile-time regression tests for the overlay store's event typing. This
 * module has no runtime behaviour and is never imported; it exists so that
 * `tsc -b` (which only checks `src/`) fails if the store's typing is ever
 * loosened.
 *
 * The store's event/emitted payload maps (`OverlayStoreEvents`, the emitted
 * map inside `overlay-store.ts`) are deliberately CLOSED — no index
 * signatures. That makes unknown `store.trigger.*`, `store.send`,
 * `store.on(...)`, and `enqueue.emit.*` event names compile errors. If one of
 * the `@ts-expect-error` lines below starts compiling, the maps have been
 * widened (e.g. an index signature was added); fix the maps, not this file.
 */
import type { OverlayCloseReason } from "./overlay-context.js"
import { createOverlayStore, type OverlayRecord } from "./overlay-store.js"

declare const record: OverlayRecord
declare const reason: OverlayCloseReason

// Never called; exists only to be typechecked.
export function overlayStoreTypeChecks(): void {
  const store = createOverlayStore()

  // --- Valid usage must compile -------------------------------------------
  store.trigger.opened({ record })
  store.trigger.updated({ id: "x", next: null })
  store.trigger.closed({ id: "x", reason })
  store.trigger.closedTop({ reason })
  store.send({ type: "closedTop", reason })
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
  })

  // --- Unknown event names must NOT compile --------------------------------
  // @ts-expect-error unknown trigger event name
  store.trigger.bogusEvent({})
  // @ts-expect-error unknown send event type
  store.send({ type: "bogusEvent" })
  // @ts-expect-error unknown emitted event name
  store.on("bogusEmit", () => {})

  // --- Wrong payloads must NOT compile --------------------------------------
  // @ts-expect-error reason must be an OverlayCloseReason
  store.trigger.closedTop({ reason: 42 })
  // @ts-expect-error record is required
  store.trigger.opened({})
}
