import { describe, expect, test } from "bun:test";
import {
  createOverlayStore,
  selectHasOverlay,
  selectIsOpen,
  selectStack,
  selectStackIds,
  selectTop,
} from "../src/overlay-store.js";
import type { OverlayClosedEmit, OverlayRecord } from "../src/overlay-store.js";
import type { OverlayOpenOptions } from "../src/overlay-context.js";

const record = function record(
  id: string,
  options: OverlayOpenOptions = {},
  prevMode = "cursor",
): OverlayRecord {
  return { id, options, payload: null, prevMode, render: () => null };
};

const collectCloses = function collectCloses(
  store: ReturnType<typeof createOverlayStore>,
): OverlayClosedEmit[] {
  const closes: OverlayClosedEmit[] = [];
  store.on("closed", (emit) => closes.push(emit));
  return closes;
};

describe("overlay store — stack transitions", () => {
  test("open/close/closeTop/update", () => {
    const store = createOverlayStore();
    const a = record("a");
    const b = record("b");

    store.trigger.opened({ record: a });
    store.trigger.opened({ record: b });
    let ctx = store.getSnapshot().context;
    expect(selectStackIds(ctx)).toEqual(["a", "b"]);
    expect(selectTop(ctx)).toBe(b);
    expect(selectHasOverlay(ctx)).toBe(true);
    expect(selectIsOpen(ctx, "a")).toBe(true);
    expect(selectIsOpen(ctx, "zzz")).toBe(false);

    store.trigger.updated({ id: "a", next: "payload!" });
    ctx = store.getSnapshot().context;
    expect(selectStack(ctx)[0]!.payload).toBe("payload!");
    // Untouched entries keep identity.
    expect(selectStack(ctx)[1]).toBe(b);

    store.trigger.updated({ id: "a", next: (prev: unknown) => `${prev}${prev}` });
    expect(selectStack(store.getSnapshot().context)[0]!.payload).toBe("payload!payload!");

    store.trigger.closedTop({ reason: "escape" });
    expect(selectStackIds(store.getSnapshot().context)).toEqual(["a"]);

    store.trigger.closed({ id: "a", reason: "close" });
    ctx = store.getSnapshot().context;
    expect(selectHasOverlay(ctx)).toBe(false);
    expect(selectTop(ctx)).toBeNull();
  });

  test("closing a missing id or empty top is a no-op (no emit, same context)", () => {
    const store = createOverlayStore();
    const closes = collectCloses(store);
    const before = store.getSnapshot().context;

    store.trigger.closed({ id: "missing", reason: "close" });
    store.trigger.closedTop({ reason: "close" });
    store.trigger.updated({ id: "missing", next: 1 });

    expect(store.getSnapshot().context).toBe(before);
    expect(closes).toEqual([]);
  });

  test("close reasons flow through the closed emit", () => {
    const store = createOverlayStore();
    const closes = collectCloses(store);
    store.trigger.opened({ record: record("a") });
    store.trigger.closed({ id: "a", reason: "unmounted" });
    expect(closes).toHaveLength(1);
    expect(closes[0]!.reason).toBe("unmounted");
  });
});

describe("overlay store — same-id replacement", () => {
  test("replacement emits closed{replaced} for the displaced record and never restores mode", () => {
    const store = createOverlayStore();
    const closes = collectCloses(store);
    // Legacy entry that would normally restore.
    const first = record("picker", {}, "cursor");
    const second = record("picker");

    store.trigger.opened({ record: first });
    store.trigger.opened({ record: second });

    expect(closes).toHaveLength(1);
    expect(closes[0]!.record).toBe(first);
    expect(closes[0]!.reason).toBe("replaced");
    expect(closes[0]!.restoreModeTo).toBeNull();

    const ctx = store.getSnapshot().context;
    expect(selectStackIds(ctx)).toEqual(["picker"]);
    expect(selectTop(ctx)).toBe(second);
  });

  test("replacement preserves stack position semantics of today's open()", () => {
    const store = createOverlayStore();
    const a = record("a");
    const b = record("b");
    store.trigger.opened({ record: a });
    store.trigger.opened({ record: b });
    // Reopening "a" removes the old entry and appends the new one on top.
    const a2 = record("a");
    store.trigger.opened({ record: a2 });
    expect(selectStackIds(store.getSnapshot().context)).toEqual(["b", "a"]);
    expect(selectTop(store.getSnapshot().context)).toBe(a2);
  });
});

describe("overlay store — restoreModeTo decision (R-04 parity)", () => {
  test("closing the topmost legacy entry restores its prevMode", () => {
    const store = createOverlayStore();
    const closes = collectCloses(store);
    store.trigger.opened({ record: record("legacy", {}, "select") });
    store.trigger.closed({ id: "legacy", reason: "close" });
    expect(closes[0]!.restoreModeTo).toBe("select");
  });

  test("closing a buried legacy entry does not restore (the one above owns the mode)", () => {
    const store = createOverlayStore();
    const closes = collectCloses(store);
    store.trigger.opened({ record: record("below", {}, "cursor") });
    store.trigger.opened({ record: record("above", {}, "insert") });

    store.trigger.closed({ id: "below", reason: "close" });
    expect(closes[0]!.record.id).toBe("below");
    expect(closes[0]!.restoreModeTo).toBeNull();

    // The topmost legacy entry still restores.
    store.trigger.closed({ id: "above", reason: "close" });
    expect(closes[1]!.restoreModeTo).toBe("insert");
  });

  test("ownCommands entries never restore, and do not shadow legacy entries", () => {
    const store = createOverlayStore();
    const closes = collectCloses(store);
    store.trigger.opened({ record: record("legacy", {}, "select") });
    store.trigger.opened({ record: record("owned", { ownCommands: true }, "cursor") });

    // The owned surface never touched the host mode: nothing to restore.
    store.trigger.closed({ id: "owned", reason: "close" });
    expect(closes[0]!.restoreModeTo).toBeNull();

    // The legacy entry is still the topmost non-ownCommands entry.
    store.trigger.opened({ record: record("owned2", { ownCommands: true }, "cursor") });
    store.trigger.closed({ id: "legacy", reason: "close" });
    expect(closes[1]!.record.id).toBe("legacy");
    expect(closes[1]!.restoreModeTo).toBe("select");
  });

  test("restoreMode: false is respected", () => {
    const store = createOverlayStore();
    const closes = collectCloses(store);
    store.trigger.opened({ record: record("no-restore", { restoreMode: false }, "select") });
    store.trigger.closed({ id: "no-restore", reason: "close" });
    expect(closes[0]!.restoreModeTo).toBeNull();
  });

  test("closedTop applies the same decision", () => {
    const store = createOverlayStore();
    const closes = collectCloses(store);
    store.trigger.opened({ record: record("top", {}, "insert") });
    store.trigger.closedTop({ reason: "escape" });
    expect(closes[0]!.restoreModeTo).toBe("insert");
  });
});
