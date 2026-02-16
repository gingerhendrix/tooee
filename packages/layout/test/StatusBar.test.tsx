import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach } from "bun:test"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { StatusBar } from "../src/StatusBar.jsx"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

test("renders label:value pairs", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar items={[{ label: "Mode", value: "cursor" }]} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Mode")
  expect(frame).toContain("cursor")
})

test("renders multiple items", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar
        items={[
          { label: "Mode", value: "cursor" },
          { label: "Line", value: "42" },
        ]}
      />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Mode")
  expect(frame).toContain("cursor")
  expect(frame).toContain("Line")
  expect(frame).toContain("42")
})

test("renders label without value", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar items={[{ label: "Ready" }]} />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Ready")
})

test("snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <StatusBar
        items={[
          { label: "Mode", value: "cursor" },
          { label: "Theme", value: "dracula" },
        ]}
      />
    </ThemeSwitcherProvider>,
    { width: 60, height: 3 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toMatchSnapshot()
})
