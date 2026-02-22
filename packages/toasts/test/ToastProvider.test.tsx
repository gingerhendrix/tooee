import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach } from "bun:test"
import { useEffect } from "react"
import { act } from "react"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { ToastProvider, useToast, ToastContainer, type ToastLevel } from "@tooee/toasts"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

/**
 * Harness that exposes toast state as text for assertions.
 */
function ToastHarness() {
  const { currentToast } = useToast()
  return (
    <box>
      <text content={currentToast ? `toast:${currentToast.level}:${currentToast.message}` : "toast:none"} />
      <text content={`id:${currentToast?.id ?? "none"}`} />
    </box>
  )
}

function ToastTrigger({ level, message, id, duration }: { level: ToastLevel; message: string; id?: string; duration?: number }) {
  const { toast } = useToast()
  useEffect(() => {
    toast({ message, level, id, duration })
  }, [])
  return null
}

function renderWithProviders(children: React.ReactNode) {
  return testRender(
    <ThemeSwitcherProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeSwitcherProvider>,
    { width: 60, height: 24 },
  )
}

test("toast appears with correct level and message", async () => {
  testSetup = await renderWithProviders(
    <>
      <ToastTrigger level="info" message="Hello world" />
      <ToastHarness />
    </>,
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("toast:info:Hello world")
})

test("dismiss clears the toast", async () => {
  let toastApi: ReturnType<typeof useToast>

  function DismissTest() {
    toastApi = useToast()
    const { currentToast } = toastApi
    return <text content={currentToast ? `toast:${currentToast.message}` : "toast:none"} />
  }

  testSetup = await renderWithProviders(<DismissTest />)

  // Show a toast
  await act(async () => {
    toastApi!.toast({ message: "will dismiss", level: "info" })
  })
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("toast:will dismiss")

  // Dismiss it
  await act(async () => {
    toastApi!.dismiss()
  })
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("toast:none")
})

test("auto-dismisses after duration", async () => {
  testSetup = await renderWithProviders(
    <>
      <ToastTrigger level="info" message="auto dismiss" duration={100} />
      <ToastHarness />
    </>,
  )
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("toast:info:auto dismiss")

  // Wait for auto-dismiss inside act() so the timer callback is properly batched
  await act(async () => {
    await new Promise((r) => setTimeout(r, 150))
  })
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("toast:none")
})

test("same ID replaces existing toast and resets timer", async () => {
  let toastApi: ReturnType<typeof useToast>

  function DedupTest() {
    toastApi = useToast()
    const { currentToast } = toastApi
    return <text content={currentToast ? `toast:${currentToast.level}:${currentToast.message}` : "toast:none"} />
  }

  testSetup = await renderWithProviders(<DedupTest />)

  // Show first toast
  await act(async () => {
    toastApi!.toast({ message: "first", level: "info", id: "dedup", duration: 100 })
  })
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("toast:info:first")

  // After 50ms, send another toast with the same ID
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
    toastApi!.toast({ message: "second", level: "success", id: "dedup", duration: 100 })
  })
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("toast:success:second")

  // Original timer would have fired at ~100ms, but replacement resets to 100ms more
  // At 130ms total, the replacement's timer hasn't fired yet
  await act(async () => {
    await new Promise((r) => setTimeout(r, 50))
  })
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("toast:success:second")

  // Wait for replacement's timer to fire
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100))
  })
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("toast:none")
})

test("each level gets correct default duration", async () => {
  function DurationTest() {
    const { toast, currentToast } = useToast()
    useEffect(() => {
      for (const l of ["info", "success", "warning", "error"] as ToastLevel[]) {
        toast({ message: `${l} toast`, level: l })
      }
    }, [])
    return <text content={`duration:${currentToast?.duration ?? "none"}`} />
  }

  testSetup = await renderWithProviders(<DurationTest />)
  await testSetup.renderOnce()
  // The last toast (error) should be the one visible, with its default 5000ms duration
  expect(testSetup.captureCharFrame()).toContain("duration:5000")
})

test("level defaults: info=2000, success=1500, warning=3000, error=5000", async () => {
  function SingleLevelTest({ level }: { level: ToastLevel }) {
    const { toast, currentToast } = useToast()
    useEffect(() => {
      toast({ message: "test", level })
    }, [])
    return <text content={`duration:${currentToast?.duration ?? "none"}`} />
  }

  // Test info
  testSetup = await renderWithProviders(<SingleLevelTest level="info" />)
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("duration:2000")
  testSetup.renderer.destroy()

  // Test success
  testSetup = await renderWithProviders(<SingleLevelTest level="success" />)
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("duration:1500")
  testSetup.renderer.destroy()

  // Test warning
  testSetup = await renderWithProviders(<SingleLevelTest level="warning" />)
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("duration:3000")
  testSetup.renderer.destroy()

  // Test error
  testSetup = await renderWithProviders(<SingleLevelTest level="error" />)
  await testSetup.renderOnce()
  expect(testSetup.captureCharFrame()).toContain("duration:5000")
})

test("ToastContainer renders icon and message", async () => {
  testSetup = await renderWithProviders(
    <>
      <ToastTrigger level="success" message="Saved!" />
      <ToastContainer />
    </>,
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("✓")
  expect(frame).toContain("Saved!")
})

test("ToastContainer renders correct icon per level", async () => {
  const icons: Record<ToastLevel, string> = {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    error: "✗",
  }

  for (const [level, icon] of Object.entries(icons) as [ToastLevel, string][]) {
    testSetup = await renderWithProviders(
      <>
        <ToastTrigger level={level} message={`${level} msg`} />
        <ToastContainer />
      </>,
    )
    await testSetup.renderOnce()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain(icon)
    expect(frame).toContain(`${level} msg`)
    testSetup.renderer.destroy()
  }
})

test("ToastContainer renders nothing when no toast", async () => {
  testSetup = await renderWithProviders(
    <>
      <text content="visible content" />
      <ToastContainer />
    </>,
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("visible content")
  // No toast icons should be present
  expect(frame).not.toContain("ℹ")
  expect(frame).not.toContain("✓")
  expect(frame).not.toContain("⚠")
  expect(frame).not.toContain("✗")
})

test("defaults to info level when level not specified", async () => {
  function DefaultLevelTest() {
    const { toast, currentToast } = useToast()
    useEffect(() => {
      toast({ message: "no level" })
    }, [])
    return <text content={currentToast ? `level:${currentToast.level}:dur:${currentToast.duration}` : "none"} />
  }

  testSetup = await renderWithProviders(<DefaultLevelTest />)
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("level:info:dur:2000")
})
