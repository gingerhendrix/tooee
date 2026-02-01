import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach } from "bun:test"
import { act } from "react"
import { TooeeProvider, useThemeCommands, useQuitCommand } from "@tooee/shell"
import { useTheme } from "@tooee/react"

function ThemeHarness() {
  useThemeCommands()
  const { name: themeName } = useTheme()
  return (
    <box>
      <text content={`theme:${themeName}`} />
    </box>
  )
}

function QuitHarness({ onQuit }: { onQuit: () => void }) {
  useQuitCommand({ onQuit })
  return (
    <box>
      <text content="quit-harness" />
    </box>
  )
}

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

function getThemeName(frame: string): string | undefined {
  return frame.match(/theme:(\S+)/)?.[1]
}

test("theme cycling with t changes theme", async () => {
  testSetup = await testRender(
    <TooeeProvider>
      <ThemeHarness />
    </TooeeProvider>,
    { width: 60, height: 24 },
  )
  await testSetup.renderOnce()
  const initialTheme = getThemeName(testSetup.captureCharFrame())
  expect(initialTheme).toBeTruthy()

  await act(async () => { testSetup.mockInput.pressKey("t") })
  await testSetup.renderOnce()
  const newTheme = getThemeName(testSetup.captureCharFrame())
  expect(newTheme).not.toBe(initialTheme)
})

test("shift+t cycles theme backwards", async () => {
  testSetup = await testRender(
    <TooeeProvider>
      <ThemeHarness />
    </TooeeProvider>,
    { width: 60, height: 24 },
  )
  await testSetup.renderOnce()
  const initialTheme = getThemeName(testSetup.captureCharFrame())

  await act(async () => { testSetup.mockInput.pressKey("T", { shift: true }) })
  await testSetup.renderOnce()
  const newTheme = getThemeName(testSetup.captureCharFrame())
  expect(newTheme).not.toBe(initialTheme)
})

test("q calls onQuit handler", async () => {
  let quitCalled = false
  testSetup = await testRender(
    <TooeeProvider>
      <QuitHarness onQuit={() => { quitCalled = true }} />
    </TooeeProvider>,
    { width: 60, height: 24 },
  )
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("quit-harness")

  await act(async () => { testSetup.mockInput.pressKey("q") })
  await testSetup.renderOnce()
  expect(quitCalled).toBe(true)
})
