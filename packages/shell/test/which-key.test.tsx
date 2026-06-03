import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { TooeeProvider, WhichKeyOverlay } from "@tooee/shell"
import { useActions, useCommand, useCommandGroup, useCommandSequenceState } from "@tooee/commands"
import type { CommandSequenceState, ParsedStep } from "@tooee/commands"
import { useCurrentOverlay, useHasOverlay } from "@tooee/overlays"
import { press, type TestSession } from "./support/test-helpers.ts"

function WhichKeyHarness() {
  const sequence = useCommandSequenceState()
  const overlay = useCurrentOverlay()
  const hasOverlay = useHasOverlay()

  useCommandGroup({ id: "stream", title: "Stream", prefix: "space s" })

  useCommand({
    id: "streams.today",
    title: "Today stream",
    hotkey: "space s t",
    modes: ["cursor"],
    handler: () => {},
  })

  useCommand({
    id: "streams.edit",
    title: "Edit stream",
    hotkey: "space s e",
    modes: ["cursor"],
    handler: () => {},
  })

  useCommand({
    id: "go.search",
    title: "Go search",
    hotkey: "g s",
    modes: ["cursor"],
    handler: () => {},
  })

  useCommand({
    id: "hidden.command",
    title: "Hidden command",
    hotkey: "space h",
    modes: ["cursor"],
    hidden: true,
    handler: () => {},
  })

  return (
    <box flexDirection="column">
      <text content={`pending:${sequence?.prefix.map((s) => s.key).join(" ") ?? "none"}`} />
      <text
        content={`labels:${sequence?.candidates.map((c) => `${c.nextStep.key}:${c.group?.title ?? c.command.group ?? c.command.title}`).join(",") ?? "none"}`}
      />
      <text content={`overlay:${hasOverlay}`} />
      {overlay}
    </box>
  )
}

function ActionMetadataHarness() {
  const sequence = useCommandSequenceState()
  const overlay = useCurrentOverlay()
  const hasOverlay = useHasOverlay()

  useActions([
    {
      id: "actions.open",
      title: "Open artifact",
      hotkey: "space a o",
      modes: ["cursor"],
      category: "Artifact",
      group: "Artifact",
      icon: "file",
      hidden: false,
      handler: () => {},
    },
    {
      id: "actions.edit",
      title: "Edit artifact",
      hotkey: "space a e",
      modes: ["cursor"],
      group: "Artifact",
      handler: () => {},
    },
  ])

  return (
    <box flexDirection="column">
      <text content={`pending:${sequence?.prefix.map((s) => s.key).join(" ") ?? "none"}`} />
      <text
        content={`labels:${sequence?.candidates.map((c) => `${c.nextStep.key}:${c.group?.title ?? c.command.group ?? c.command.title}`).join(",") ?? "none"}`}
      />
      <text content={`overlay:${hasOverlay}`} />
      {overlay}
    </box>
  )
}

async function setup(children = <WhichKeyHarness />) {
  const s = await testRender(<TooeeProvider leader="space">{children}</TooeeProvider>, {
    width: 80,
    height: 24,
    kittyKeyboard: true,
  })
  await s.renderOnce()
  return s
}

let testSetup: TestSession

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("which-key", () => {
  test("shows a passive overlay after a leader command sequence starts", async () => {
    testSetup = await setup()

    await press(testSetup, " ")
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("overlay:true")
    expect(frame).toContain("s → Stream")
    expect(frame).not.toContain("Hidden command")
  })

  test("does not show the overlay for non-leader command sequences by default", async () => {
    testSetup = await setup()

    await press(testSetup, "g")
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("pending:g")
    expect(frame).toContain("overlay:false")
    expect(frame).not.toContain("which-key:")
  })

  test("updates and clears sequence state as a command completes", async () => {
    testSetup = await setup()

    await press(testSetup, " ")
    await testSetup.renderOnce()
    await press(testSetup, "s")
    await testSetup.renderOnce()

    const nestedFrame = testSetup.captureCharFrame()
    expect(nestedFrame).toContain("overlay:true")
    expect(nestedFrame).toContain("t → Today stream")
    expect(nestedFrame).toContain("e → Edit stream")

    await press(testSetup, "t")
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("pending:none")
    expect(frame).toContain("overlay:false")
    expect(frame).not.toContain("which-key:")
  })

  test("useActions preserves command display metadata for fallback group labels", async () => {
    testSetup = await setup(<ActionMetadataHarness />)

    await press(testSetup, " ")
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("a → Artifact")
  })

  test("renders named grouped next-key entries", async () => {
    const space = step("space")
    const s = step("s")
    const t = step("t")
    const e = step("e")
    const state: CommandSequenceState = {
      prefix: [space],
      candidates: [
        {
          command: {
            id: "streams.today",
            title: "Today stream",
            handler: () => {},
          },
          hotkey: "space s t",
          steps: [space, s, t],
          remainingSteps: [s, t],
          nextStep: s,
          group: { id: "stream", title: "Stream", prefix: "space s" },
        },
        {
          command: {
            id: "streams.edit",
            title: "Edit stream",
            handler: () => {},
          },
          hotkey: "space s e",
          steps: [space, s, e],
          remainingSteps: [s, e],
          nextStep: s,
          group: { id: "stream", title: "Stream", prefix: "space s" },
        },
      ],
    }

    testSetup = await testRender(
      <TooeeProvider leader="space">
        <WhichKeyOverlay state={state} />
      </TooeeProvider>,
      { width: 80, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("which-key: space")
    expect(frame).toContain("s → Stream")
  })
})

function step(key: string): ParsedStep {
  return { key, ctrl: false, meta: false, option: false, shift: false }
}
