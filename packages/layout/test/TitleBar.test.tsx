import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach } from "bun:test"
import { ThemeSwitcherProvider } from "@tooee/themes"
import { TitleBar } from "../src/TitleBar.js"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

test("renders title text", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <TitleBar title="My Title" />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("My Title")
})

test("renders subtitle when provided", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <TitleBar title="My Title" subtitle="A subtitle" />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("My Title")
  expect(frame).toContain("A subtitle")
})

test("does not render subtitle when not provided", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <TitleBar title="Only Title" />
    </ThemeSwitcherProvider>,
    { width: 80, height: 24 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("Only Title")
  expect(frame).not.toContain("—")
})

test("snapshot", async () => {
  testSetup = await testRender(
    <ThemeSwitcherProvider>
      <TitleBar title="Snapshot Title" subtitle="Sub" />
    </ThemeSwitcherProvider>,
    { width: 60, height: 3 },
  )
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toMatchSnapshot()
})
