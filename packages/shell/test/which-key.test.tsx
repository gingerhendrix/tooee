import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { TooeeProvider, WhichKeyOverlay } from "@tooee/shell"
import { useCommand, useCommandSequenceState } from "@tooee/commands"
import type { CommandSequenceState, ParsedStep } from "@tooee/commands"
import { useCurrentOverlay, useHasOverlay } from "@tooee/overlays"
import { press, type TestSession } from "./support/test-helpers.ts"

function WhichKeyHarness() {
  const sequence = useCommandSequenceState()
  const overlay = useCurrentOverlay()
  const hasOverlay = useHasOverlay()

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
      <text content={`overlay:${hasOverlay}`} />
      {overlay}
    </box>
  )
}

async function setup() {
  const s = await testRender(
    <TooeeProvider>
      <WhichKeyHarness />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  )
  await s.renderOnce()
  return s
}

let testSetup: TestSession

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("which-key", () => {
  test("shows a passive overlay after a partial command sequence", async () => {
    testSetup = await setup()

    await press(testSetup, " ")
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("overlay:true")
    expect(frame).not.toContain("Hidden command")
  })

  test("updates and clears sequence state as a command completes", async () => {
    testSetup = await setup()

    await press(testSetup, " ")
    await testSetup.renderOnce()
    await press(testSetup, "s")
    await testSetup.renderOnce()

    const nestedFrame = testSetup.captureCharFrame()
    expect(nestedFrame).toContain("overlay:true")

    await press(testSetup, "t")
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("pending:none")
    expect(frame).toContain("overlay:false")
    expect(frame).not.toContain("which-key:")
  })

  test("renders grouped next-key entries", async () => {
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
        },
      ],
    }

    testSetup = await testRender(
      <TooeeProvider>
        <WhichKeyOverlay state={state} />
      </TooeeProvider>,
      { width: 80, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("which-key: space")
    expect(frame).toContain("s → t… Today stream / e… Edit stream")
  })
})

function step(key: string): ParsedStep {
  return { key, ctrl: false, meta: false, option: false, shift: false }
}
