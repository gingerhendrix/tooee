import { describe, expect, test } from "bun:test";
import {
  ROOT_SURFACE_ID,
  createCommandStore,
  selectActivePanelSurface,
  selectKeyboardOwnerSurface,
  selectSequence,
} from "../src/command-store.js";
import type { CommandStore, SurfaceRecord } from "../src/command-store.js";
import type { Command, CommandContext } from "../src/types.js";
import type { Mode } from "../src/mode.js";
import { keyEvent as key } from "./support/key-event.ts";

const fakeCtx = function fakeCtx(mode: Mode): CommandContext {
  return {
    commands: { invoke: () => {}, list: () => [] },
    exit: () => {},
    mode,
    setMode: () => {},
  };
};

const makeStore = function makeStore(options?: {
  keymap?: Record<string, string>;
  sequenceTimeoutMs?: number;
}): CommandStore {
  return createCommandStore({
    keymap: options?.keymap,
    root: { buildCtx: () => fakeCtx("cursor"), getMode: () => "cursor" },
    sequenceTimeoutMs: options?.sequenceTimeoutMs,
  });
};

const makeModal = function makeModal(id: string, depth: number): SurfaceRecord {
  return {
    buildCtx: () => fakeCtx("cursor"),
    depth,
    getMode: () => "cursor",
    id,
    order: 0,
    role: "modal",
  };
};

const makePanel = function makePanel(id: string, groupId: string, depth: number): SurfaceRecord {
  return {
    buildCtx: () => fakeCtx("cursor"),
    depth,
    getMode: () => "cursor",
    groupId,
    id,
    order: 0,
    role: "panel",
  };
};

const command = function command(
  id: string,
  hotkey: string,
  overrides?: Partial<Command>,
): Command {
  return { defaultHotkey: hotkey, handler: () => {}, id, title: id, ...overrides };
};

const ctxOf = function ctxOf(cs: CommandStore) {
  return cs.store.getSnapshot().context;
};

const sleep = async function sleep(ms: number): Promise<void> {
  await Bun.sleep(ms);
};

describe("panel surfaces — activation & selectors", () => {
  test("a panel is active only once its group publishes its id", () => {
    const cs = makeStore();
    const list = makePanel("list", "g", 1);
    const detail = makePanel("detail", "g", 1);
    cs.pushSurface(list);
    cs.pushSurface(detail);

    // Mounted but not yet activated: no panel owns input.
    expect(selectActivePanelSurface(ctxOf(cs))).toBeNull();

    cs.activatePanel("g", "list");
    expect(selectActivePanelSurface(ctxOf(cs))).toBe(list);

    cs.activatePanel("g", "detail");
    expect(selectActivePanelSurface(ctxOf(cs))).toBe(detail);
  });

  test("panel surfaces never win by stack depth/order; only the active id selects them", () => {
    const cs = makeStore();
    const list = makePanel("list", "g", 1);
    // `detail` is deeper and later, but not the active panel.
    const detail = makePanel("detail", "g", 5);
    cs.pushSurface(list);
    cs.pushSurface(detail);
    cs.activatePanel("g", "list");

    // Despite `detail` being deeper and later, `list` is the active panel (I-5).
    expect(selectActivePanelSurface(ctxOf(cs))).toBe(list);
  });

  test("removing a panel group drops its activation", () => {
    const cs = makeStore();
    const list = makePanel("list", "g", 1);
    cs.pushSurface(list);
    cs.activatePanel("g", "list");
    expect(selectActivePanelSurface(ctxOf(cs))).toBe(list);

    cs.removePanelGroup("g");
    expect(selectActivePanelSurface(ctxOf(cs))).toBeNull();
    expect(selectKeyboardOwnerSurface(ctxOf(cs))).toBeNull();
  });

  test("selectKeyboardOwnerSurface: modal > panel > root(null)", () => {
    const cs = makeStore();
    // Root only.
    expect(selectKeyboardOwnerSurface(ctxOf(cs))).toBeNull();

    const panel = makePanel("list", "g", 1);
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");
    expect(selectKeyboardOwnerSurface(ctxOf(cs))).toBe(panel);

    const modal = makeModal("m", 2);
    cs.pushSurface(modal);
    expect(selectKeyboardOwnerSurface(ctxOf(cs))).toBe(modal);
  });
});

describe("panel surfaces — dispatch precedence", () => {
  test("modal > panel > root: the active panel dispatches instead of root; a modal preempts both", () => {
    const cs = makeStore();
    let rootFired = 0;
    let panelFired = 0;
    let modalFired = 0;
    cs.registryFor(cs.rootRecord).register(
      command("root.a", "a", { handler: () => (rootFired += 1) }),
    );
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.a", "a", { handler: () => (panelFired += 1) }));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    let result = cs.key(key("a"));
    result.invoke?.();
    expect(panelFired).toBe(1);
    expect(rootFired).toBe(0);

    // A modal surface preempts the active panel (I-2).
    const modal = makeModal("m", 2);
    cs.registryFor(modal).register(command("m.a", "a", { handler: () => (modalFired += 1) }));
    cs.pushSurface(modal);

    result = cs.key(key("a"));
    result.invoke?.();
    expect(modalFired).toBe(1);
    expect(panelFired).toBe(1);
    expect(rootFired).toBe(0);
  });

  test("an unactivated panel does not grab keys; root dispatches", () => {
    const cs = makeStore();
    let rootFired = 0;
    let panelFired = 0;
    cs.registryFor(cs.rootRecord).register(
      command("root.a", "a", { handler: () => (rootFired += 1) }),
    );
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.a", "a", { handler: () => (panelFired += 1) }));
    // Pushed, never activated.
    cs.pushSurface(panel);

    const result = cs.key(key("a"));
    result.invoke?.();
    expect(rootFired).toBe(1);
    expect(panelFired).toBe(0);
  });

  test("inactive panel commands never dispatch (I-3)", () => {
    const cs = makeStore();
    let listFired = 0;
    let detailFired = 0;
    const list = makePanel("list", "g", 1);
    const detail = makePanel("detail", "g", 1);
    cs.registryFor(list).register(command("list.j", "j", { handler: () => (listFired += 1) }));
    cs.registryFor(detail).register(
      command("detail.k", "k", { handler: () => (detailFired += 1) }),
    );
    cs.pushSurface(list);
    cs.pushSurface(detail);
    cs.activatePanel("g", "list");

    // `k` belongs to the inactive `detail` panel: it must not fire, and (no root
    // binding) it is unhandled.
    expect(cs.key(key("k")).handled).toBe(false);
    expect(detailFired).toBe(0);

    // The active panel's own command fires.
    cs.key(key("j")).invoke?.();
    expect(listFired).toBe(1);
  });
});

describe("panel surfaces — fall-through & shadowing", () => {
  test("unmatched keys fall through to the enclosing (root) surface", () => {
    const cs = makeStore();
    let quitFired = 0;
    cs.registryFor(cs.rootRecord).register(
      command("quit", "q", { handler: () => (quitFired += 1) }),
    );
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.j", "j", { handler: () => {} }));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    // `q` is unbound on the panel: it falls through to the root's quit command.
    const result = cs.key(key("q"));
    expect(result.handled).toBe(true);
    result.invoke?.();
    expect(quitFired).toBe(1);
  });

  test("a panel command shadows a root command with the same hotkey", () => {
    const cs = makeStore();
    let rootFired = 0;
    let panelFired = 0;
    cs.registryFor(cs.rootRecord).register(
      command("root.a", "a", { handler: () => (rootFired += 1) }),
    );
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.a", "a", { handler: () => (panelFired += 1) }));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    cs.key(key("a")).invoke?.();
    expect(panelFired).toBe(1);
    expect(rootFired).toBe(0);
  });

  test("a panel pending chord shadows a colliding root single-step and completes on the panel", () => {
    const cs = makeStore();
    let rootG = 0;
    let panelChord = 0;
    cs.registryFor(cs.rootRecord).register(command("root.g", "g", { handler: () => (rootG += 1) }));
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.gg", "g g", { handler: () => (panelChord += 1) }));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    // First `g`: the panel's multi-step chord goes pending and shadows root `g`.
    const first = cs.key(key("g"));
    expect(first.handled).toBe(true);
    expect(first.invoke).toBeUndefined();
    expect(selectSequence(ctxOf(cs))).not.toBeNull();
    expect(rootG).toBe(0);

    // Second `g`: routed to the chord owner (the panel), completing it.
    const second = cs.key(key("g"));
    second.invoke?.();
    expect(panelChord).toBe(1);
    expect(rootG).toBe(0);
    expect(selectSequence(ctxOf(cs))).toBeNull();
  });

  test("fall-through into a root chord: the root becomes the sequence owner and completes", () => {
    const cs = makeStore();
    let rootChord = 0;
    cs.registryFor(cs.rootRecord).register(
      command("root.gg", "g g", { handler: () => (rootChord += 1) }),
    );
    const panel = makePanel("list", "g", 1);
    // Panel has an unrelated command, so `g` misses on the panel and falls through.
    cs.registryFor(panel).register(command("list.j", "j", { handler: () => {} }));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    const first = cs.key(key("g"));
    expect(first.handled).toBe(true);
    expect(selectSequence(ctxOf(cs))).not.toBeNull();

    const second = cs.key(key("g"));
    second.invoke?.();
    expect(rootChord).toBe(1);
    expect(selectSequence(ctxOf(cs))).toBeNull();
  });

  test("a panel multi-step miss does not duplicate one key into a repeated-key root chord", () => {
    const cs = makeStore();
    let rootChord = 0;
    cs.registryFor(cs.rootRecord).register(
      command("root.gg", "g g", { handler: () => (rootChord += 1) }),
    );
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.jj", "j j"));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    // One physical `g` misses the panel, then becomes only the first root step.
    const first = cs.key(key("g"));
    first.invoke?.();
    expect(first.handled).toBe(true);
    expect(first.invoke).toBeUndefined();
    expect(rootChord).toBe(0);
    expect(selectSequence(ctxOf(cs))?.prefix).toHaveLength(1);

    cs.key(key("g")).invoke?.();
    expect(rootChord).toBe(1);
  });

  test("a full panel-to-root miss leaves dispatch clean for the next root chord", () => {
    const cs = makeStore();
    let rootChord = 0;
    cs.registryFor(cs.rootRecord).register(
      command("root.qg", "q g", { handler: () => (rootChord += 1) }),
    );
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.jj", "j j"));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    expect(cs.key(key("x")).handled).toBe(false);
    expect(selectSequence(ctxOf(cs))).toBeNull();

    expect(cs.key(key("q")).handled).toBe(true);
    cs.key(key("g")).invoke?.();
    expect(rootChord).toBe(1);
  });

  test("cancelling a panel chord clears its buffer and timer before later root dispatch", () => {
    const cs = makeStore({ sequenceTimeoutMs: 20 });
    let rootChord = 0;
    cs.registryFor(cs.rootRecord).register(
      command("root.qg", "q g", { handler: () => (rootChord += 1) }),
    );
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.jj", "j j"));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    expect(cs.key(key("j")).handled).toBe(true);
    expect(selectSequence(ctxOf(cs))).not.toBeNull();
    // The chord owner consumes the cancellation attempt without root retry.
    expect(cs.key(key("x")).handled).toBe(false);
    expect(selectSequence(ctxOf(cs))).toBeNull();

    expect(cs.key(key("q")).handled).toBe(true);
    cs.key(key("g")).invoke?.();
    expect(rootChord).toBe(1);
  });

  test("an insert-mode panel suppresses all root fall-through", () => {
    const cs = makeStore();
    let quit = 0;
    let switched = 0;
    cs.registryFor(cs.rootRecord).register(
      command("quit", "q", { handler: () => (quit += 1), modes: ["cursor"] }),
    );
    cs.registryFor(cs.rootRecord).register(
      command("panels.next", "tab", {
        handler: () => (switched += 1),
        modes: ["cursor", "select"],
      }),
    );
    const panel: SurfaceRecord = {
      buildCtx: () => fakeCtx("insert"),
      depth: 1,
      getMode: () => "insert",
      groupId: "g",
      id: "editor",
      order: 0,
      role: "panel",
    };
    cs.registryFor(panel).register(command("editor.cursor-only", "j", { modes: ["cursor"] }));
    cs.pushSurface(panel);
    cs.activatePanel("g", "editor");

    const typed = cs.key(key("q"));
    typed.invoke?.();
    const tab = cs.key(key("tab"));
    tab.invoke?.();

    expect(typed.handled).toBe(false);
    expect(tab.handled).toBe(false);
    expect(quit).toBe(0);
    expect(switched).toBe(0);
    expect(selectSequence(ctxOf(cs))).toBeNull();
  });
});

describe("panel surfaces — pending chord isolation & ownership", () => {
  test("switching the active panel mid-chord clears the pending sequence and buffer", () => {
    const cs = makeStore();
    let aChord = 0;
    const a = makePanel("a", "g", 1);
    const b = makePanel("b", "g", 1);
    cs.registryFor(a).register(command("a.gg", "g g", { handler: () => (aChord += 1) }));
    cs.pushSurface(a);
    cs.pushSurface(b);
    cs.activatePanel("g", "a");

    cs.key(key("g"));
    expect(selectSequence(ctxOf(cs))).not.toBeNull();

    // Activation is an ownership change: the pending chord is dropped.
    cs.activatePanel("g", "b");
    expect(selectSequence(ctxOf(cs))).toBeNull();

    // The buffer was cleared too: a stray `g` cannot complete panel A's chord
    // (A is inactive now anyway).
    expect(cs.key(key("g")).invoke).toBeUndefined();
    expect(aChord).toBe(0);
  });

  test("re-activating the same panel does not clear a pending chord (idempotent)", () => {
    const cs = makeStore();
    const a = makePanel("a", "g", 1);
    cs.registryFor(a).register(command("a.gg", "g g", {}));
    cs.pushSurface(a);
    cs.activatePanel("g", "a");

    cs.key(key("g"));
    expect(selectSequence(ctxOf(cs))).not.toBeNull();

    // No-op activation (already active).
    cs.activatePanel("g", "a");
    expect(selectSequence(ctxOf(cs))).not.toBeNull();
  });

  test("a modal opened over a pending panel chord clears it; the panel is restored on close", () => {
    const cs = makeStore();
    let panelChord = 0;
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.gg", "g g", { handler: () => (panelChord += 1) }));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    cs.key(key("g"));
    expect(selectSequence(ctxOf(cs))).not.toBeNull();

    // Modal preempts the panel — ownership change clears the chord (I-2).
    const modal = makeModal("m", 2);
    const popModal = cs.pushSurface(modal);
    expect(selectSequence(ctxOf(cs))).toBeNull();
    expect(selectKeyboardOwnerSurface(ctxOf(cs))).toBe(modal);

    // Closing the modal returns input to the same panel, unchanged.
    popModal();
    expect(selectActivePanelSurface(ctxOf(cs))).toBe(panel);
    expect(selectKeyboardOwnerSurface(ctxOf(cs))).toBe(panel);

    // A fresh chord on the restored panel still completes.
    cs.key(key("g"));
    cs.key(key("g")).invoke?.();
    expect(panelChord).toBe(1);
  });

  test("keys mid-chord route only to the chord owner (panel), not to a colliding root command", () => {
    const cs = makeStore();
    let rootX = 0;
    let panelChord = 0;
    cs.registryFor(cs.rootRecord).register(command("root.x", "x", { handler: () => (rootX += 1) }));
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.gg", "g g", { handler: () => (panelChord += 1) }));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    // Panel chord pending; the panel owns subsequent keys.
    cs.key(key("g"));
    // `x` would be a root command, but the panel owns the chord: routing stays on
    // the panel, which cancels the chord and does not match `x`.
    const result = cs.key(key("x"));
    expect(result.handled).toBe(false);
    expect(rootX).toBe(0);
    expect(panelChord).toBe(0);
    expect(selectSequence(ctxOf(cs))).toBeNull();
  });

  test("chord ownership times out and releases (panel)", async () => {
    const cs = makeStore({ sequenceTimeoutMs: 20 });
    let rootA = 0;
    cs.registryFor(cs.rootRecord).register(command("root.a", "a", { handler: () => (rootA += 1) }));
    const panel = makePanel("list", "g", 1);
    cs.registryFor(panel).register(command("list.gg", "g g", {}));
    cs.pushSurface(panel);
    cs.activatePanel("g", "list");

    cs.key(key("g"));
    expect(selectSequence(ctxOf(cs))).not.toBeNull();
    await sleep(40);
    expect(selectSequence(ctxOf(cs))).toBeNull();

    // After the timeout the owner is released: `a` falls through to root again.
    cs.key(key("a")).invoke?.();
    expect(rootA).toBe(1);
  });
});

describe("panel surfaces — selector discipline", () => {
  test("activation preserves the identity of untouched context slices", () => {
    const cs = makeStore();
    const panel = makePanel("list", "g", 1);
    cs.pushSurface(panel);
    const before = ctxOf(cs);
    cs.activatePanel("g", "list");
    const after = ctxOf(cs);

    expect(after.activePanels).not.toBe(before.activePanels);
    expect(after.activePanels.get("g")).toBe("list");
    expect(after.surfaces).toBe(before.surfaces);
    expect(after.commandsBySurface).toBe(before.commandsBySurface);
    expect(after.groups).toBe(before.groups);
  });

  test("ROOT_SURFACE_ID is never reported as an active panel", () => {
    const cs = makeStore();
    // A nonsensical activation id that must not resolve to the root record.
    cs.activatePanel("g", ROOT_SURFACE_ID);
    expect(selectActivePanelSurface(ctxOf(cs))).toBeNull();
  });
});
