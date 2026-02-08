import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { TooeeProvider, useThemeCommands } from "@tooee/shell"
import { useTheme, useCurrentOverlay } from "@tooee/react"
import { useMode } from "@tooee/commands"

function ThemePickerHarness() {
  const { name: themeName, picker } = useThemeCommands()
  const mode = useMode()
  const { name: activeTheme } = useTheme()
  const overlay = useCurrentOverlay()

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`open:${picker.isOpen}`} />
      <text content={`theme:${themeName}`} />
      <text content={`active:${activeTheme}`} />
      {overlay}
    </box>
  )
}

async function setup() {
  const s = await testRender(
    <TooeeProvider>
      <ThemePickerHarness />
    </TooeeProvider>,
    { width: 80, height: 40, kittyKeyboard: true },
  )
  await s.renderOnce()
  await s.renderOnce()
  return s
}

async function pressKey(s: Awaited<ReturnType<typeof testRender>>, key: string) {
  await act(async () => {
    s.mockInput.pressKey(key)
  })
  await s.renderOnce()
}

async function pressArrow(s: Awaited<ReturnType<typeof testRender>>, dir: "up" | "down") {
  await act(async () => {
    s.mockInput.pressArrow(dir)
  })
  await s.renderOnce()
}

async function pressEnter(s: Awaited<ReturnType<typeof testRender>>) {
  await act(async () => {
    s.mockInput.pressEnter()
  })
  await s.renderOnce()
}

async function pressEscape(s: Awaited<ReturnType<typeof testRender>>) {
  await act(async () => {
    s.mockInput.pressEscape()
  })
  await s.renderOnce()
}

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("theme picker", () => {
  test("t opens theme picker and switches to insert mode", async () => {
    testSetup = await setup()
    expect(testSetup.captureCharFrame()).toContain("open:false")
    await pressKey(testSetup, "t")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("open:true")
    expect(frame).toContain("mode:insert")
  })

  test("Escape closes picker and reverts theme", async () => {
    testSetup = await setup()
    const initialFrame = testSetup.captureCharFrame()
    const initialTheme = initialFrame.match(/active:(\S+)/)?.[1]

    await pressKey(testSetup, "t")
    expect(testSetup.captureCharFrame()).toContain("open:true")

    // Navigate up to preview a different theme (zenburn is last alphabetically,
    // so down does nothing — navigate up instead)
    await pressArrow(testSetup, "up")
    const afterNav = testSetup.captureCharFrame()
    const previewedTheme = afterNav.match(/active:(\S+)/)?.[1]
    // Theme should have changed during preview
    expect(previewedTheme).not.toBe(initialTheme)

    // Press Escape to cancel
    await pressEscape(testSetup)
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("open:false")
    expect(frame).toContain("mode:command")
    expect(frame).toContain(`active:${initialTheme}`)
  })

  test("Enter confirms theme selection", async () => {
    testSetup = await setup()
    await pressKey(testSetup, "t")
    expect(testSetup.captureCharFrame()).toContain("open:true")

    // Navigate up to a different theme (zenburn is last alphabetically)
    await pressArrow(testSetup, "up")

    // Get the previewed theme before confirming
    const previewFrame = testSetup.captureCharFrame()
    const previewedTheme = previewFrame.match(/active:(\S+)/)?.[1]

    // Confirm
    await pressEnter(testSetup)
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("open:false")
    expect(frame).toContain("mode:command")
    // Theme should stay at the previewed value
    expect(frame).toContain(`active:${previewedTheme}`)
  })

  test("picker shows theme entries", async () => {
    testSetup = await setup()
    await pressKey(testSetup, "t")
    const openFrame = testSetup.captureCharFrame()
    expect(openFrame).toContain("open:true")
    // Should show at least the first theme in the list
    expect(openFrame).toContain("aura")
    // Should show filter count
    expect(openFrame).toMatch(/\d+/)
  })
})
