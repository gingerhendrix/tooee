import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach } from "bun:test"
import { act } from "react"
import { TooeeProvider } from "@tooee/shell"
import { useCommand } from "@tooee/commands"
import { useToast } from "@tooee/toasts"

function ToastContextHarness() {
  const { currentToast } = useToast()

  useCommand({
    id: "test.toast-via-ctx",
    title: "Toast via context",
    hotkey: "1",
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.toast({ message: "from context", level: "success" })
    },
  })

  useCommand({
    id: "test.dismiss-via-ctx",
    title: "Dismiss via context",
    hotkey: "2",
    modes: ["cursor"],
    handler: (ctx) => {
      ctx.toast.dismiss()
    },
  })

  return (
    <box>
      <text content={currentToast ? `ctx-toast:${currentToast.level}:${currentToast.message}` : "ctx-toast:none"} />
    </box>
  )
}

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

test("ctx.toast is available in command handlers", async () => {
  testSetup = await testRender(
    <TooeeProvider>
      <ToastContextHarness />
    </TooeeProvider>,
    { width: 60, height: 24, kittyKeyboard: true },
  )
  await testSetup.renderOnce()
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("ctx-toast:none")

  await act(async () => {
    testSetup.mockInput.pressKey("1")
  })
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("ctx-toast:success:from context")
})

test("ctx.toast.dismiss works from command handler", async () => {
  testSetup = await testRender(
    <TooeeProvider>
      <ToastContextHarness />
    </TooeeProvider>,
    { width: 60, height: 24, kittyKeyboard: true },
  )
  await testSetup.renderOnce()
  await testSetup.renderOnce()

  // Show a toast
  await act(async () => {
    testSetup.mockInput.pressKey("1")
  })
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("ctx-toast:success:from context")

  // Dismiss it
  await act(async () => {
    testSetup.mockInput.pressKey("2")
  })
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("ctx-toast:none")
})
