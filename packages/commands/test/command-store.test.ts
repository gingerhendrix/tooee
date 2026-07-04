import { describe, expect, test } from "bun:test"
import type { KeyEvent } from "@opentui/core"
import {
  ROOT_SURFACE_ID,
  createCommandStore,
  selectActiveModalSurface,
  selectSequence,
  selectSurfaceCommands,
  stepsKey,
  type CommandStore,
  type SurfaceRecord,
} from "../src/command-store.js"
import { parseHotkey } from "../src/parse.js"
import type { Command, CommandContext, RegisteredCommandGroup } from "../src/types.js"
import type { Mode } from "../src/mode.js"

function key(name: string, modifiers?: Partial<KeyEvent>): KeyEvent {
  return {
    name,
    ctrl: false,
    meta: false,
    shift: false,
    option: false,
    ...modifiers,
  } as KeyEvent
}

function fakeCtx(mode: Mode): CommandContext {
  return { mode, setMode: () => {}, commands: { invoke: () => {}, list: () => [] }, exit: () => {} }
}

function makeStore(options?: {
  leader?: string
  keymap?: Record<string, string>
  sequenceTimeoutMs?: number
  rootMode?: () => Mode
}): CommandStore {
  const getMode = options?.rootMode ?? (() => "cursor" as Mode)
  return createCommandStore({
    leader: options?.leader,
    keymap: options?.keymap,
    sequenceTimeoutMs: options?.sequenceTimeoutMs,
    root: { getMode, buildCtx: () => fakeCtx(getMode()) },
  })
}

function makeSurface(
  id: string,
  role: "modal" | "passive",
  depth: number,
  mode: () => Mode = () => "cursor",
): SurfaceRecord {
  return {
    id,
    role,
    depth,
    order: 0,
    getMode: mode,
    buildCtx: () => fakeCtx(mode()),
  }
}

function command(id: string, hotkey: string, overrides?: Partial<Command>): Command {
  return { id, title: id, defaultHotkey: hotkey, handler: () => {}, ...overrides }
}

function group(prefix: string, title: string, leader?: string): RegisteredCommandGroup {
  return {
    id: `group-${title}`,
    title,
    prefix,
    prefixKey: stepsKey(parseHotkey(prefix, leader).steps),
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe("command store — registration", () => {
  test("registers and unregisters commands on the root surface", () => {
    const cs = makeStore()
    const registry = cs.registryFor(cs.rootRecord)
    const cmd = command("a", "a")
    const unregister = registry.register(cmd)

    expect(selectSurfaceCommands(cs.store.getSnapshot().context, ROOT_SURFACE_ID)).toEqual([cmd])
    unregister()
    expect(selectSurfaceCommands(cs.store.getSnapshot().context, ROOT_SURFACE_ID)).toEqual([])
  })

  test("commands can register before their surface record is pushed", () => {
    // React child effects run before the parent surface's register effect.
    const cs = makeStore()
    const surface = makeSurface("s1", "modal", 1)
    const registry = cs.registryFor(surface)
    const cmd = command("s1.a", "a")
    registry.register(cmd)

    expect(selectSurfaceCommands(cs.store.getSnapshot().context, "s1")).toEqual([cmd])

    const pop = cs.pushSurface(surface)
    expect(selectActiveModalSurface(cs.store.getSnapshot().context)).toBe(surface)

    // Parent pop runs before child unregisters on unmount; both must be safe.
    pop()
    expect(selectActiveModalSurface(cs.store.getSnapshot().context)).toBeNull()
    expect(selectSurfaceCommands(cs.store.getSnapshot().context, "s1")).toEqual([cmd])
  })

  test("duplicate ids: last write wins; unregister is identity-guarded (R-05)", () => {
    const cs = makeStore()
    const registry = cs.registryFor(cs.rootRecord)
    const first = command("dup", "d")
    const second = command("dup", "d")
    const unregisterFirst = registry.register(first)
    registry.register(second)

    // Last writer holds the id.
    expect(registry.commands.get("dup")).toBe(second)

    // First registrant's unregister must not delete the second's live command.
    unregisterFirst()
    expect(registry.commands.get("dup")).toBe(second)
  })

  test("group registration and identity-guarded unregistration", () => {
    const cs = makeStore()
    const first = group("g", "First")
    const second = group("g", "Second")

    cs.store.trigger.groupRegistered({ group: first })
    cs.store.trigger.groupRegistered({ group: second })
    expect(cs.store.getSnapshot().context.groups.get("g")).toBe(second)

    // First registrant's cleanup must not delete the second's live group.
    cs.store.trigger.groupUnregistered({ group: first })
    expect(cs.store.getSnapshot().context.groups.get("g")).toBe(second)

    cs.store.trigger.groupUnregistered({ group: second })
    expect(cs.store.getSnapshot().context.groups.has("g")).toBe(false)
  })

  test("context source registration and unregistration", () => {
    const cs = makeStore()
    const getter = () => ({ mode: "cursor" as Mode })
    cs.store.trigger.contextSourceRegistered({ id: "src-1", getter })
    expect(cs.store.getSnapshot().context.contextSources.get("src-1")).toBe(getter)
    cs.store.trigger.contextSourceUnregistered({ id: "src-1" })
    expect(cs.store.getSnapshot().context.contextSources.has("src-1")).toBe(false)
  })

  test("invoke respects when() and builds the surface's own context", () => {
    const cs = makeStore()
    const surface = makeSurface("s1", "modal", 1, () => "insert")
    const registry = cs.registryFor(surface)
    const seen: Mode[] = []
    let blocked = 0
    registry.register(command("go", "g", { handler: (ctx) => seen.push(ctx.mode) }))
    registry.register(command("no", "n", { when: () => false, handler: () => blocked++ }))

    registry.invoke("go")
    registry.invoke("no")
    registry.invoke("missing")
    expect(seen).toEqual(["insert"])
    expect(blocked).toBe(0)
  })
})

describe("command store — surface arbitration", () => {
  test("deepest modal surface wins; order breaks depth ties", () => {
    const cs = makeStore()
    const a = makeSurface("a", "modal", 1)
    const b = makeSurface("b", "modal", 2)
    const c = makeSurface("c", "modal", 2)

    cs.pushSurface(a)
    cs.pushSurface(b)
    cs.pushSurface(c)

    // b and c share depth 2; c registered later (higher order).
    expect(selectActiveModalSurface(cs.store.getSnapshot().context)).toBe(c)
    expect(c.order).toBeGreaterThan(b.order)
  })

  test("passive surfaces and the root never win arbitration", () => {
    const cs = makeStore()
    const passive = makeSurface("p", "passive", 3)
    cs.pushSurface(passive)
    expect(selectActiveModalSurface(cs.store.getSnapshot().context)).toBeNull()
  })

  test("popping the active surface restores the one below", () => {
    const cs = makeStore()
    const a = makeSurface("a", "modal", 1)
    const b = makeSurface("b", "modal", 2)
    cs.pushSurface(a)
    const popB = cs.pushSurface(b)
    popB()
    expect(selectActiveModalSurface(cs.store.getSnapshot().context)).toBe(a)
  })
})

describe("command store — key dispatch", () => {
  test("single-step match invokes the handler with the surface context", () => {
    const cs = makeStore()
    let fired = 0
    cs.registryFor(cs.rootRecord).register(command("a", "a", { handler: () => fired++ }))

    const result = cs.key(key("a"))
    expect(result.handled).toBe(true)
    result.invoke?.()
    expect(fired).toBe(1)

    expect(cs.key(key("x")).handled).toBe(false)
  })

  test("commands are filtered by mode and when()", () => {
    let mode: Mode = "cursor"
    const cs = makeStore({ rootMode: () => mode })
    let fired = 0
    let gated = 0
    const registry = cs.registryFor(cs.rootRecord)
    registry.register(command("ins", "i", { modes: ["insert"], handler: () => fired++ }))
    registry.register(command("gated", "g", { when: () => false, handler: () => gated++ }))

    expect(cs.key(key("i")).handled).toBe(false) // wrong mode
    expect(cs.key(key("g")).handled).toBe(false) // when() gate

    mode = "insert"
    const result = cs.key(key("i"))
    expect(result.handled).toBe(true)
    result.invoke?.()
    expect(fired).toBe(1)
    expect(gated).toBe(0)
  })

  test("multi-step: pending sets display state with group metadata, completion invokes", () => {
    const cs = makeStore()
    let fired = 0
    const registry = cs.registryFor(cs.rootRecord)
    registry.register(command("top", "g g", { handler: () => fired++ }))
    const g = group("g g", "Goto")
    cs.store.trigger.groupRegistered({ group: g })

    const first = cs.key(key("g"))
    expect(first.handled).toBe(true)
    expect(first.invoke).toBeUndefined()

    const sequence = selectSequence(cs.store.getSnapshot().context)
    expect(sequence).not.toBeNull()
    expect(sequence!.prefix).toHaveLength(1)
    expect(sequence!.candidates).toHaveLength(1)
    expect(sequence!.candidates[0]!.command.id).toBe("top")
    expect(sequence!.candidates[0]!.group).toBe(g)

    const second = cs.key(key("g"))
    expect(second.handled).toBe(true)
    second.invoke?.()
    expect(fired).toBe(1)
    expect(selectSequence(cs.store.getSnapshot().context)).toBeNull()
  })

  test("hidden commands are excluded from the pending display", () => {
    const cs = makeStore()
    const registry = cs.registryFor(cs.rootRecord)
    registry.register(command("shown", "g s", {}))
    registry.register(command("hidden", "g h", { hidden: true }))

    cs.key(key("g"))
    const sequence = selectSequence(cs.store.getSnapshot().context)
    expect(sequence!.candidates.map((c) => c.command.id)).toEqual(["shown"])
  })

  test("a non-matching key clears the pending display", () => {
    const cs = makeStore()
    cs.registryFor(cs.rootRecord).register(command("top", "g g", {}))

    cs.key(key("g"))
    expect(selectSequence(cs.store.getSnapshot().context)).not.toBeNull()
    cs.key(key("x"))
    expect(selectSequence(cs.store.getSnapshot().context)).toBeNull()
  })

  test("modeChanged clears the pending buffer and display (F-08 at store level)", () => {
    const cs = makeStore()
    let fired = 0
    cs.registryFor(cs.rootRecord).register(command("top", "g g", { handler: () => fired++ }))

    cs.key(key("g"))
    expect(selectSequence(cs.store.getSnapshot().context)).not.toBeNull()
    cs.modeChanged(ROOT_SURFACE_ID)
    expect(selectSequence(cs.store.getSnapshot().context)).toBeNull()

    // The chord must not complete after the reset.
    const result = cs.key(key("g"))
    expect(result.invoke).toBeUndefined()
    expect(fired).toBe(0)
  })

  test("pushing/popping a modal surface clears the pending sequence (F-09 at store level)", () => {
    const cs = makeStore()
    cs.registryFor(cs.rootRecord).register(command("top", "g g", {}))

    cs.key(key("g"))
    expect(selectSequence(cs.store.getSnapshot().context)).not.toBeNull()
    const pop = cs.pushSurface(makeSurface("s1", "modal", 1))
    expect(selectSequence(cs.store.getSnapshot().context)).toBeNull()

    // Pop with a pending sequence on the surface: also clears.
    cs.registryFor(cs.rootRecord) // root chord again after pop
    pop()
    expect(selectSequence(cs.store.getSnapshot().context)).toBeNull()
  })

  test("same-id modal surface replacement clears the pending sequence (F-09 replacement)", () => {
    const cs = makeStore()
    const first = makeSurface("same", "modal", 1)
    let onFirst = 0
    cs.registryFor(first).register(command("chord", "g g", { handler: () => onFirst++ }))
    cs.pushSurface(first)

    cs.key(key("g"))
    expect(selectSequence(cs.store.getSnapshot().context)).not.toBeNull()

    // Replace with a new record under the same id (record identity changes).
    const second = makeSurface("same", "modal", 1)
    cs.pushSurface(second)
    expect(selectSequence(cs.store.getSnapshot().context)).toBeNull()
    expect(cs.key(key("g")).invoke).toBeUndefined()
    expect(onFirst).toBe(0)
  })

  test("pushing a passive surface does NOT clear the pending sequence (which-key)", () => {
    const cs = makeStore()
    cs.registryFor(cs.rootRecord).register(command("top", "g g", {}))

    cs.key(key("g"))
    expect(selectSequence(cs.store.getSnapshot().context)).not.toBeNull()

    // which-key opens a passive overlay while displaying the sequence.
    const pop = cs.pushSurface(makeSurface("which-key", "passive", 1))
    expect(selectSequence(cs.store.getSnapshot().context)).not.toBeNull()
    pop()
    expect(selectSequence(cs.store.getSnapshot().context)).not.toBeNull()

    // ... and the chord still completes.
    let fired = 0
    cs.registryFor(cs.rootRecord).register(command("top2", "x x", { handler: () => fired++ }))
    const result = cs.key(key("g"))
    expect(result.handled).toBe(true)
  })

  test("a modal surface's commands dispatch instead of the root's", () => {
    const cs = makeStore()
    let rootFired = 0
    let surfaceFired = 0
    cs.registryFor(cs.rootRecord).register(command("a", "a", { handler: () => rootFired++ }))
    const surface = makeSurface("s1", "modal", 1)
    cs.registryFor(surface).register(command("s1.a", "a", { handler: () => surfaceFired++ }))
    cs.pushSurface(surface)

    const result = cs.key(key("a"))
    result.invoke?.()
    expect(surfaceFired).toBe(1)
    expect(rootFired).toBe(0)

    // Unmatched keys are swallowed (handled: false, but no root dispatch).
    expect(cs.key(key("q")).handled).toBe(false)
  })

  test("timeout fires sequenceReset and cancels the chord", async () => {
    const cs = makeStore({ sequenceTimeoutMs: 20 })
    let fired = 0
    cs.registryFor(cs.rootRecord).register(command("top", "g g", { handler: () => fired++ }))

    cs.key(key("g"))
    expect(selectSequence(cs.store.getSnapshot().context)).not.toBeNull()
    await sleep(40)
    expect(selectSequence(cs.store.getSnapshot().context)).toBeNull()

    cs.key(key("g"))
    expect(fired).toBe(0)
  })

  test("dispose cancels the pending timer", async () => {
    const cs = makeStore({ sequenceTimeoutMs: 20 })
    cs.registryFor(cs.rootRecord).register(command("top", "g g", {}))

    cs.key(key("g"))
    let notified = 0
    cs.store.subscribe(() => notified++)
    cs.dispose()
    await sleep(40)
    // No timer fire after dispose: the store was not touched.
    expect(notified).toBe(0)
  })

  test("keymap overrides the default hotkey", () => {
    const cs = makeStore({ keymap: { save: "w" } })
    let fired = 0
    cs.registryFor(cs.rootRecord).register(command("save", "s", { handler: () => fired++ }))

    expect(cs.key(key("s")).handled).toBe(false)
    const result = cs.key(key("w"))
    expect(result.handled).toBe(true)
    result.invoke?.()
    expect(fired).toBe(1)
  })

  test("leader parsing works and leaderless <leader> hotkeys never match", () => {
    const withLeader = makeStore({ leader: "space" })
    let fired = 0
    withLeader
      .registryFor(withLeader.rootRecord)
      .register(command("leader.cmd", "<leader>n", { handler: () => fired++ }))
    withLeader.key(key("space"))
    const result = withLeader.key(key("n"))
    expect(result.handled).toBe(true)
    result.invoke?.()
    expect(fired).toBe(1)

    const without = makeStore()
    let ghost = 0
    without
      .registryFor(without.rootRecord)
      .register(command("leader.cmd", "<leader>n", { handler: () => ghost++ }))
    expect(without.key(key("x", { ctrl: true })).handled).toBe(false)
    expect(without.key(key("n")).handled).toBe(false)
    expect(without.key(key("a")).handled).toBe(false)
    expect(ghost).toBe(0)
  })
})

describe("command store — selector discipline", () => {
  test("registering a command preserves the identity of untouched slices", () => {
    const cs = makeStore()
    const before = cs.store.getSnapshot().context
    cs.registryFor(cs.rootRecord).register(command("a", "a"))
    const after = cs.store.getSnapshot().context

    expect(after.commandsBySurface).not.toBe(before.commandsBySurface)
    expect(after.groups).toBe(before.groups)
    expect(after.contextSources).toBe(before.contextSources)
    expect(after.surfaces).toBe(before.surfaces)
    expect(after.sequence).toBe(before.sequence)
  })

  test("registering a command on one surface preserves other surfaces' command maps", () => {
    const cs = makeStore()
    const surface = makeSurface("s1", "modal", 1)
    cs.registryFor(cs.rootRecord).register(command("root.a", "a"))
    const before = cs.store.getSnapshot().context
    cs.registryFor(surface).register(command("s1.a", "a"))
    const after = cs.store.getSnapshot().context

    expect(after.commandsBySurface.get(ROOT_SURFACE_ID)).toBe(
      before.commandsBySurface.get(ROOT_SURFACE_ID)!,
    )
  })
})
