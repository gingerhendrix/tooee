import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
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

// === Block mode scroll tests ===

// 5 blocks with varying heights, 50 total lines:
//   block 0: lines 0-4   (5 lines)
//   block 1: lines 5-9   (5 lines)
//   block 2: lines 10-24 (15 lines)
//   block 3: lines 25-39 (15 lines)
//   block 4: lines 40-49 (10 lines)
const blockLineMap = [0, 5, 10, 25, 40]
const blockTotalLines = 50
const blockCount = 5

function BlockHarness() {
  const nav = useModalNavigationCommands({
    totalLines: blockTotalLines,
    viewportHeight: 10,
    blockCount,
    blockLineMap,
  })
  return (
    <box flexDirection="column">
      <text content={`mode:${nav.mode}`} />
      <text content={`scroll:${nav.scrollOffset}`} />
      <text content={`cursor:${nav.cursor ? nav.cursor.line : "null"}`} />
    </box>
  )
}

async function setupBlock() {
  const s = await testRender(
    <TooeeProvider>
      <BlockHarness />
    </TooeeProvider>,
    { width: 60, height: 24 },
  )
  await s.renderOnce()
  return s
}

describe("block mode scrolling", () => {
  // Block mode scroll positioning is handled by View.tsx using rendered layout,
  // not by scrollOffset in modal.ts. scrollOffset stays at 0 for block mode.
  test("scrollOffset stays 0 in block mode — View.tsx handles scroll via layout", async () => {
    testSetup = await setupBlock()
    // cursor starts at block 0, scroll 0
    const frame0 = testSetup.captureCharFrame()
    expect(frame0).toContain("cursor:0")
    expect(frame0).toContain("scroll:0")

    // Move through blocks — cursor updates but scrollOffset stays at 0
    await press(testSetup, "j")
    const frame1 = testSetup.captureCharFrame()
    expect(frame1).toContain("cursor:1")
    expect(frame1).toContain("scroll:0")

    await press(testSetup, "j")
    const frame2 = testSetup.captureCharFrame()
    expect(frame2).toContain("cursor:2")
    expect(frame2).toContain("scroll:0")
  })

  test("cursor navigation works correctly in block mode", async () => {
    testSetup = await setupBlock()
    // Navigate forward and back
    await press(testSetup, "j") // block 1
    await press(testSetup, "j") // block 2

    await press(testSetup, "k") // back to block 1
    expect(testSetup.captureCharFrame()).toContain("cursor:1")

    await press(testSetup, "k") // back to block 0
    expect(testSetup.captureCharFrame()).toContain("cursor:0")
  })

  test("G jumps cursor to last block", async () => {
    testSetup = await setupBlock()
    await press(testSetup, "G", { shift: true })
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("cursor:4")
    // scrollOffset stays at 0 — View.tsx handles actual scroll positioning
    expect(frame).toContain("scroll:0")
  })
})
