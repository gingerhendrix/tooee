import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach } from "bun:test"
import { act } from "react"
import { TooeeProvider, useThemeCommands, useQuitCommand } from "@tooee/shell"
import { useTheme } from "@tooee/react"
import { useMode } from "@tooee/commands"

function ThemeHarness() {
  const { picker } = useThemeCommands()
  const { name: themeName } = useTheme()
  const mode = useMode()
  return (
    <box>
      <text content={`theme:${themeName}`} />
      <text content={`open:${picker.isOpen}`} />
      <text content={`mode:${mode}`} />
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

test("t opens theme picker", async () => {
  testSetup = await testRender(
    <TooeeProvider>
      <ThemeHarness />
    </TooeeProvider>,
    { width: 60, height: 24, kittyKeyboard: true },
  )
  await testSetup.renderOnce()
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("open:false")

  await act(async () => {
    testSetup.mockInput.pressKey("t")
  })
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("open:true")
  expect(frame).toContain("mode:insert")
})

test("q calls onQuit handler", async () => {
  let quitCalled = false
  testSetup = await testRender(
    <TooeeProvider>
      <QuitHarness
        onQuit={() => {
          quitCalled = true
        }}
      />
    </TooeeProvider>,
    { width: 60, height: 24, kittyKeyboard: true },
  )
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("quit-harness")

  await act(async () => {
    testSetup.mockInput.pressKey("q")
  })
  await testSetup.renderOnce()
  expect(quitCalled).toBe(true)
})
