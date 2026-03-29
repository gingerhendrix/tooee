import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { TooeeProvider } from "@tooee/shell"
import { useCommand, useMode } from "@tooee/commands"
import { useHasOverlay } from "@tooee/overlays"
import { press, pressEscape, type TestSession } from "./support/test-helpers.ts"

function PaletteHarness() {
  const mode = useMode()
  const hasOverlay = useHasOverlay()

  // Register some test commands
  useCommand({
    id: "test.visible",
    title: "Visible Command",
    hotkey: "t",
    modes: ["cursor"],
    handler: () => {},
  })

  useCommand({
    id: "test.hidden",
    title: "Hidden Command",
    hotkey: "h",
    modes: ["cursor"],
    hidden: true,
    handler: () => {},
  })

  useCommand({
    id: "test.cursor-only",
    title: "Cursor Only Command",
    hotkey: "c",
    modes: ["cursor"],
    handler: () => {},
  })

  useCommand({
    id: "test.insert-only",
    title: "Insert Only Command",
    hotkey: "i",
    modes: ["insert"],
    handler: () => {},
  })

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`open:${hasOverlay}`} />
    </box>
  )
}

async function setup() {
  const s = await testRender(
    <TooeeProvider>
      <PaletteHarness />
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

describe("command palette", () => {
  test(": opens palette and switches to insert mode", async () => {
    testSetup = await setup()
    await press(testSetup, ":")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("open:true")
    expect(frame).toContain("mode:insert")
  })

  test("close restores cursor mode", async () => {
    testSetup = await setup()
    await press(testSetup, ":")
    const openFrame = testSetup.captureCharFrame()
    expect(openFrame).toContain("open:true")
    expect(openFrame).toContain("mode:insert")
    await pressEscape(testSetup)
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("open:false")
    expect(frame).toContain("mode:cursor")
  })
})
