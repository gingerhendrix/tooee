import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach } from "bun:test"
import { act } from "react"
import { TooeeProvider, useModalNavigationCommands } from "@tooee/shell"

function ModalHarness({ totalLines }: { totalLines: number }) {
  const nav = useModalNavigationCommands({ totalLines, viewportHeight: 10 })
  return (
    <box flexDirection="column">
      <text content={`mode:${nav.mode}`} />
      <text content={`scroll:${nav.scrollOffset}`} />
      <text content={`cursor:${nav.cursor ? nav.cursor.line : "null"}`} />
      <text content={`search:${nav.searchActive}`} />
    </box>
  )
}

async function setup(totalLines = 100) {
  const s = await testRender(
    <TooeeProvider>
      <ModalHarness totalLines={totalLines} />
    </TooeeProvider>,
    { width: 60, height: 24 },
  )
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

test("starts in cursor mode with cursor at 0", async () => {
  testSetup = await setup()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("mode:cursor")
  expect(frame).toContain("scroll:0")
  expect(frame).toContain("cursor:0")
})

test("j moves cursor down", async () => {
  testSetup = await setup()
  await press(testSetup, "j")
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("cursor:1")
  // Scroll stays at 0 — cursor is still within viewport (height=10)
  expect(frame).toContain("scroll:0")
})

test("k moves cursor up", async () => {
  testSetup = await setup()
  await press(testSetup, "j")
  await press(testSetup, "j")
  await press(testSetup, "k")
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("cursor:1")
  expect(frame).toContain("scroll:0")
})

test("gg moves cursor to top", async () => {
  testSetup = await setup()
  await press(testSetup, "j")
  await press(testSetup, "j")
  await press(testSetup, "j")
  expect(testSetup.captureCharFrame()).toContain("cursor:3")
  await act(async () => {
    testSetup.mockInput.pressKey("g")
  })
  await act(async () => {
    testSetup.mockInput.pressKey("g")
  })
  await testSetup.renderOnce()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("cursor:0")
  expect(frame).toContain("scroll:0")
})

test("shift+g moves cursor to bottom", async () => {
  testSetup = await setup()
  await press(testSetup, "G", { shift: true })
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("scroll:90")
  expect(frame).toContain("cursor:99")
})

test("ctrl+d moves cursor half page down", async () => {
  testSetup = await setup()
  await press(testSetup, "d", { ctrl: true })
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("cursor:5")
  // Cursor at 5 is still within viewport (height=10), scroll stays at 0
  expect(frame).toContain("scroll:0")
})

test("ctrl+u moves cursor half page up", async () => {
  testSetup = await setup()
  await press(testSetup, "d", { ctrl: true })
  await press(testSetup, "d", { ctrl: true })
  // Cursor at 10 is outside viewport (height=10), scroll adjusts
  expect(testSetup.captureCharFrame()).toContain("cursor:10")
  await press(testSetup, "u", { ctrl: true })
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("cursor:5")
})

test("/ activates search", async () => {
  testSetup = await setup()
  await press(testSetup, "/")
  expect(testSetup.captureCharFrame()).toContain("search:true")
})
