import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { TooeeProvider, useModalNavigationCommands } from "@tooee/shell"

function ModalHarness({ totalLines }: { totalLines: number }) {
  const nav = useModalNavigationCommands({ totalLines, viewportHeight: 10 })
  return (
    <box flexDirection="column">
      <text content={`mode:${nav.mode}`} />
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
  expect(frame).toContain("cursor:0")
})

test("j moves cursor down", async () => {
  testSetup = await setup()
  await press(testSetup, "j")
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("cursor:1")
})

test("k moves cursor up", async () => {
  testSetup = await setup()
  await press(testSetup, "j")
  await press(testSetup, "j")
  await press(testSetup, "k")
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("cursor:1")
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
})

test("shift+g moves cursor to bottom", async () => {
  testSetup = await setup()
  await press(testSetup, "G", { shift: true })
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("cursor:99")
})

test("ctrl+d moves cursor half page down", async () => {
  testSetup = await setup()
  await press(testSetup, "d", { ctrl: true })
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("cursor:5")
})

test("ctrl+u moves cursor half page up", async () => {
  testSetup = await setup()
  await press(testSetup, "d", { ctrl: true })
  await press(testSetup, "d", { ctrl: true })
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
  // Scroll is managed by RowDocumentRenderable.scrollToRow(), not by the modal hook.
  test("cursor navigates through blocks", async () => {
    testSetup = await setupBlock()
    const frame0 = testSetup.captureCharFrame()
    expect(frame0).toContain("cursor:0")

    await press(testSetup, "j")
    const frame1 = testSetup.captureCharFrame()
    expect(frame1).toContain("cursor:1")

    await press(testSetup, "j")
    const frame2 = testSetup.captureCharFrame()
    expect(frame2).toContain("cursor:2")
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
  })
})
