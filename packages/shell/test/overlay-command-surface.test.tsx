import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { useState } from "react"
import { TooeeProvider, useQuitCommand } from "@tooee/shell"
import { useCommand, useMode, useSetMode, useActiveCommandSurface } from "@tooee/commands"
import { useOverlay, useCurrentOverlay } from "@tooee/overlays"
import type { OverlayCloseReason } from "@tooee/overlays"
import { press, pressEnter, pressEscape, type TestSession } from "./support/test-helpers.ts"

function AskSurface({
  onSubmit,
  onCancel,
}: {
  onSubmit: (value: string) => void
  onCancel: () => void
}) {
  const mode = useMode()
  const setMode = useSetMode()

  useCommand({
    id: "ask.submit",
    title: "Submit",
    hotkey: "Enter",
    handler: () => onSubmit("hello"),
  })
  useCommand({ id: "ask.cancel", title: "Cancel", hotkey: "Escape", handler: onCancel })
  useCommand({
    id: "ask.insert",
    title: "Insert mode",
    hotkey: "i",
    handler: () => setMode("insert"),
  })

  return (
    <box flexDirection="column">
      <text content="ASK_OVERLAY" />
      <text content={`askmode:${mode}`} />
    </box>
  )
}

function PassiveSurface({ onAction }: { onAction: () => void }) {
  // Bound to the same hotkey the root uses to prove passive surfaces never win.
  useCommand({ id: "passive.quit-like", title: "Passive", hotkey: "q", handler: onAction })
  return <text content="PASSIVE_OVERLAY" />
}

function Harness() {
  const overlay = useOverlay()
  const current = useCurrentOverlay()
  const mode = useMode()
  const active = useActiveCommandSurface()

  const [quit, setQuit] = useState(0)
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(0)
  const [passiveAction, setPassiveAction] = useState(0)

  useQuitCommand({ onQuit: () => setQuit((n) => n + 1) })

  useCommand({
    id: "open-ask",
    title: "Open ask",
    hotkey: "o",
    handler: () => {
      overlay.open(
        "ask",
        ({ close }: { close: (reason?: OverlayCloseReason) => void }) => (
          <AskSurface
            onSubmit={(value) => {
              setSubmitted(value)
              close()
            }}
            onCancel={() => {
              setCancelled((n) => n + 1)
              close("escape")
            }}
          />
        ),
        null,
        { ownCommands: true, role: "modal", surfaceMode: "cursor" },
      )
    },
  })

  useCommand({
    id: "open-passive",
    title: "Open passive",
    hotkey: "p",
    handler: () => {
      overlay.open(
        "passive",
        () => <PassiveSurface onAction={() => setPassiveAction((n) => n + 1)} />,
        null,
        { ownCommands: true, role: "passive" },
      )
    },
  })

  return (
    <box flexDirection="column">
      <text content={`rootmode:${mode}`} />
      <text content={`active:${active ? active.id : "root"}`} />
      <text content={`quit:${quit}`} />
      <text content={`submitted:${submitted ?? "none"}`} />
      <text content={`cancelled:${cancelled}`} />
      <text content={`passiveAction:${passiveAction}`} />
      {current}
    </box>
  )
}

async function setup() {
  const session = await testRender(
    <TooeeProvider>
      <Harness />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  )
  await session.renderOnce()
  return session
}

let testSetup: TestSession

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("overlay-owned command surfaces", () => {
  test("opening a modal overlay makes it the active command surface", async () => {
    testSetup = await setup()
    expect(testSetup.captureCharFrame()).toContain("active:root")
    await press(testSetup, "o")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("ASK_OVERLAY")
    expect(frame).toContain("active:ask")
  })

  test("parent quit cannot fire while a modal overlay is active", async () => {
    testSetup = await setup()
    await press(testSetup, "o")
    await press(testSetup, "q") // root quit hotkey, but overlay has no 'q' command
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("quit:0") // parent quit suspended
    expect(frame).toContain("ASK_OVERLAY") // overlay still open
  })

  test("overlay submit command fires and closes the overlay", async () => {
    testSetup = await setup()
    await press(testSetup, "o")
    await pressEnter(testSetup)
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("submitted:hello")
    expect(frame).not.toContain("ASK_OVERLAY")
    expect(frame).toContain("active:root")
  })

  test("Escape is handled by the overlay's own cancel command", async () => {
    testSetup = await setup()
    await press(testSetup, "o")
    await pressEscape(testSetup)
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("cancelled:1")
    expect(frame).not.toContain("ASK_OVERLAY")
  })

  test("parent command dispatch resumes after the overlay closes", async () => {
    testSetup = await setup()
    await press(testSetup, "o")
    await pressEscape(testSetup) // close via overlay cancel
    await press(testSetup, "q") // root quit works again
    expect(testSetup.captureCharFrame()).toContain("quit:1")
  })

  test("local overlay mode does not leak into the root mode", async () => {
    testSetup = await setup()
    await press(testSetup, "o")
    await press(testSetup, "i") // overlay: setMode("insert")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("askmode:insert") // overlay-local mode changed
    expect(frame).toContain("rootmode:cursor") // host mode untouched
  })

  test("a passive overlay does not steal keyboard focus from the root", async () => {
    testSetup = await setup()
    await press(testSetup, "p")
    const opened = testSetup.captureCharFrame()
    expect(opened).toContain("PASSIVE_OVERLAY")
    expect(opened).toContain("active:root") // passive overlay is not the keyboard owner

    await press(testSetup, "q") // 'q' is bound on both root and the passive surface
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("quit:1") // root quit fired
    expect(frame).toContain("passiveAction:0") // passive surface command never fired
  })
})
