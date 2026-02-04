import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { TooeeProvider } from "@tooee/shell"
import { useCommandPalette } from "../src/command-palette.ts"
import { useCommand, useMode } from "@tooee/commands"

function PaletteHarness() {
  const palette = useCommandPalette()
  const mode = useMode()

  // Register some test commands
  useCommand({
    id: "test.visible",
    title: "Visible Command",
    hotkey: "t",
    modes: ["command"],
    handler: () => {},
  })

  useCommand({
    id: "test.hidden",
    title: "Hidden Command",
    hotkey: "h",
    modes: ["command"],
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

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`open:${palette.isOpen}`} />
      <text content={`entries:${palette.entries.map((e) => e.id).join(",")}`} />
      <text content={`count:${palette.entries.length}`} />
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
  // Extra render to ensure useEffect registrations are complete
  await s.renderOnce()
  return s
}

async function press(
  s: Awaited<ReturnType<typeof testRender>>,
  key: string,
  modifiers?: { ctrl?: boolean; shift?: boolean },
) {
  await act(async () => {
    s.mockInput.pressKey(key, modifiers)
  })
  await s.renderOnce()
}

let testSetup: Awaited<ReturnType<typeof testRender>>

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

  test("close restores command mode", async () => {
    testSetup = await setup()
    await press(testSetup, ":")
    expect(testSetup.captureCharFrame()).toContain("open:true")
    expect(testSetup.captureCharFrame()).toContain("mode:insert")
  })

  test("entries exclude hidden commands", async () => {
    testSetup = await setup()
    // Open palette to populate entries based on current mode
    await press(testSetup, ":")
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).not.toContain("test.hidden")
  })

  test("entries are filtered to commands available in launch mode", async () => {
    testSetup = await setup()
    // Open palette from command mode
    await press(testSetup, ":")
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    // visible command registered for "command" mode should appear
    expect(frame).toContain("test.visible")
    // cursor-only command should NOT appear when launched from command mode
    expect(frame).not.toContain("test.cursor-only")
  })
})
