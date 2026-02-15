import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach } from "bun:test"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { AppLayout } from "../src/AppLayout.tsx"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

test("renders title bar with title and subtitle", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <AppLayout
        titleBar={{ title: "App Title", subtitle: "v1.0" }}
        statusBar={{ items: [{ label: "OK" }] }}
      >
        <text content="body" />
      </AppLayout>
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("App Title")
  expect(frame).toContain("v1.0")
})

test("renders status bar with items", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <AppLayout statusBar={{ items: [{ label: "Mode", value: "cursor" }] }}>
        <text content="body" />
      </AppLayout>
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Mode")
  expect(frame).toContain("cursor")
})

test("renders children in scrollable area", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <AppLayout statusBar={{ items: [{ label: "OK" }] }}>
        <text content="Child Content Here" />
      </AppLayout>
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Child Content Here")
})

test("snapshot full layout", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <AppLayout
        titleBar={{ title: "Test App", subtitle: "snapshot" }}
        statusBar={{
          items: [
            { label: "Mode", value: "cmd" },
            { label: "Line", value: "1" },
          ],
        }}
      >
        <text content="Main content area" />
      </AppLayout>
    </ThemeSwitcherProvider>,
    { width: 60, height: 10 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toMatchSnapshot()
})
