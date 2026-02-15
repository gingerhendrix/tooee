import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { TooeeProvider } from "@tooee/shell"
import { useOverlay, useCurrentOverlay, useHasOverlay } from "@tooee/overlays"
import { AppLayout } from "@tooee/layout"
import { useCommand } from "@tooee/commands"

function OverlayHarness() {
  const overlay = useOverlay()
  const current = useCurrentOverlay()
  const has = useHasOverlay()

  useCommand({
    id: "test.show-a",
    title: "Show A",
    hotkey: "a",
    modes: ["cursor"],
    handler: () => {
      overlay.show("a", <text content="overlay-a" />)
    },
  })

  useCommand({
    id: "test.show-b",
    title: "Show B",
    hotkey: "b",
    modes: ["cursor"],
    handler: () => {
      overlay.show("b", <text content="overlay-b" />)
    },
  })

  useCommand({
    id: "test.hide-a",
    title: "Hide A",
    hotkey: "x",
    modes: ["cursor"],
    handler: () => {
      overlay.hide("a")
    },
  })

  useCommand({
    id: "test.hide-b",
    title: "Hide B",
    hotkey: "y",
    modes: ["cursor"],
    handler: () => {
      overlay.hide("b")
    },
  })

  useCommand({
    id: "test.replace-a",
    title: "Replace A",
    hotkey: "r",
    modes: ["cursor"],
    handler: () => {
      overlay.show("a", <text content="overlay-a-replaced" />)
    },
  })

  return (
    <box flexDirection="column">
      <text content={`has:${has}`} />
      <text content={`current:${current ? "yes" : "no"}`} />
    </box>
  )
}

function AppLayoutOverlayHarness() {
  const overlay = useOverlay()

  useCommand({
    id: "test.show-overlay",
    title: "Show",
    hotkey: "s",
    modes: ["cursor"],
    handler: () => {
      overlay.show("test", <text content="OVERLAY_CONTENT" />)
    },
  })

  useCommand({
    id: "test.hide-overlay",
    title: "Hide",
    hotkey: "h",
    modes: ["cursor"],
    handler: () => {
      overlay.hide("test")
    },
  })

  return (
    <AppLayout statusBar={{ items: [{ label: "Mode:", value: "cursor" }] }}>
      <text content="main-content" />
    </AppLayout>
  )
}

async function setup(component: React.ReactNode) {
  const s = await testRender(<TooeeProvider>{component}</TooeeProvider>, {
    width: 80,
    height: 24,
    kittyKeyboard: true,
  })
  await s.renderOnce()
  await s.renderOnce()
  return s
}

async function press(s: Awaited<ReturnType<typeof testRender>>, key: string) {
  await act(async () => {
    s.mockInput.pressKey(key)
  })
  await s.renderOnce()
}

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("overlay system", () => {
  test("initially has no overlay", async () => {
    testSetup = await setup(<OverlayHarness />)
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("has:false")
    expect(frame).toContain("current:no")
  })

  test("show makes overlay visible", async () => {
    testSetup = await setup(<OverlayHarness />)
    await press(testSetup, "a")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("has:true")
    expect(frame).toContain("current:yes")
  })

  test("hide removes overlay", async () => {
    testSetup = await setup(<OverlayHarness />)
    await press(testSetup, "a")
    expect(testSetup.captureCharFrame()).toContain("has:true")
    await press(testSetup, "x")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("has:false")
    expect(frame).toContain("current:no")
  })

  test("last overlay shown is current (stack behavior)", async () => {
    testSetup = await setup(<OverlayHarness />)
    await press(testSetup, "a")
    await press(testSetup, "b")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("has:true")
  })

  test("hiding top overlay reveals the one below", async () => {
    testSetup = await setup(<OverlayHarness />)
    await press(testSetup, "a")
    await press(testSetup, "b")
    await press(testSetup, "y")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("has:true")
    expect(frame).toContain("current:yes")
  })

  test("same ID replaces existing overlay (no duplicates)", async () => {
    testSetup = await setup(<OverlayHarness />)
    await press(testSetup, "a")
    await press(testSetup, "r")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("has:true")
    // Hide once should remove the replaced overlay entirely
    await press(testSetup, "x")
    const frame2 = testSetup.captureCharFrame()
    expect(frame2).toContain("has:false")
  })

  test("hiding non-existent ID is a no-op", async () => {
    testSetup = await setup(<OverlayHarness />)
    await press(testSetup, "x")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("has:false")
  })

  test("overlay renders in AppLayout via context", async () => {
    testSetup = await setup(<AppLayoutOverlayHarness />)
    const frameBefore = testSetup.captureCharFrame()
    expect(frameBefore).toContain("main-content")
    expect(frameBefore).not.toContain("OVERLAY_CONTENT")
    await press(testSetup, "s")
    const frameAfter = testSetup.captureCharFrame()
    expect(frameAfter).toContain("OVERLAY_CONTENT")
  })
})
