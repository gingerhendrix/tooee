import { testRender } from "@opentui/react/test-utils"
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
  test("scrolls down to show full block when block extends below viewport", async () => {
    testSetup = await setupBlock()
    // cursor starts at block 0 (lines 0-4), scroll 0
    const frame0 = testSetup.captureCharFrame()
    expect(frame0).toContain("cursor:0")
    expect(frame0).toContain("scroll:0")

    // Move to block 1 (lines 5-9) — end line is 9, fits in viewport (0+10=10), no scroll
    await press(testSetup, "j")
    const frame1 = testSetup.captureCharFrame()
    expect(frame1).toContain("cursor:1")
    expect(frame1).toContain("scroll:0")

    // Move to block 2 (lines 10-24, 15 lines tall)
    // Block end is line 24, which is well past viewport (0+10=10)
    // Should scroll so line 24 is visible: scroll = 24 - 10 + 1 = 15
    await press(testSetup, "j")
    const frame2 = testSetup.captureCharFrame()
    expect(frame2).toContain("cursor:2")
    expect(frame2).toContain("scroll:15")
  })

  test("scrolls up to show top of block", async () => {
    testSetup = await setupBlock()
    // Navigate to block 2 to push scroll forward
    await press(testSetup, "j") // block 1
    await press(testSetup, "j") // block 2, scroll adjusts to 15

    // Move back to block 1 (starts at line 5) — line 5 < scroll 15, so scroll to 5
    await press(testSetup, "k")
    expect(testSetup.captureCharFrame()).toContain("cursor:1")
    expect(testSetup.captureCharFrame()).toContain("scroll:5")

    // Move back to block 0 (starts at line 0) — line 0 < scroll 5, so scroll to 0
    await press(testSetup, "k")
    expect(testSetup.captureCharFrame()).toContain("cursor:0")
    expect(testSetup.captureCharFrame()).toContain("scroll:0")
  })

  test("last block scrolls correctly using totalLines for end", async () => {
    testSetup = await setupBlock()
    // Jump to last block with shift+g
    await press(testSetup, "G", { shift: true })
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("cursor:4")
    // Block 4 starts at line 40, ends at line 49 (totalLines-1)
    // scroll should be clamped to maxScroll = 50-10 = 40
    expect(frame).toContain("scroll:40")
  })
})
