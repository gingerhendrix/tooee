import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { TooeeProvider, useModalNavigationCommands } from "@tooee/shell"

function CursorHarness({ totalLines }: { totalLines: number }) {
  const nav = useModalNavigationCommands({ totalLines, viewportHeight: 10 })
  const sel = nav.selection
  return (
    <box flexDirection="column">
      <text content={`mode:${nav.mode}`} />
      <text content={`scroll:${nav.scrollOffset}`} />
      <text content={`cursor:${nav.cursor ? nav.cursor.line : "null"}`} />
      <text content={`selection:${sel ? `${sel.start.line}-${sel.end.line}` : "null"}`} />
    </box>
  )
}

async function setup(totalLines = 100) {
  const s = await testRender(
    <TooeeProvider>
      <CursorHarness totalLines={totalLines} />
    </TooeeProvider>,
    { width: 60, height: 24, kittyKeyboard: true },
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

async function pressEscape(s: Awaited<ReturnType<typeof testRender>>) {
  await act(async () => {
    s.mockInput.pressEscape()
  })
  await s.renderOnce()
}

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

describe("cursor mode", () => {
  test("starts in cursor mode with initialized cursor", async () => {
    testSetup = await setup()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("mode:cursor")
    expect(frame).toContain("cursor:0")
  })

  test("j in cursor mode moves cursor down", async () => {
    testSetup = await setup()
    expect(testSetup.captureCharFrame()).toContain("cursor:0")
    await press(testSetup, "j")
    expect(testSetup.captureCharFrame()).toContain("cursor:1")
  })

  test("k in cursor mode moves cursor up", async () => {
    testSetup = await setup()
    await press(testSetup, "j")
    await press(testSetup, "j")
    expect(testSetup.captureCharFrame()).toContain("cursor:2")
    await press(testSetup, "k")
    expect(testSetup.captureCharFrame()).toContain("cursor:1")
  })

  test("Escape in cursor mode leaves mode unchanged", async () => {
    testSetup = await setup()
    expect(testSetup.captureCharFrame()).toContain("mode:cursor")
    await pressEscape(testSetup)
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("mode:cursor")
    expect(frame).toContain("cursor:0")
  })
})

describe("select mode", () => {
  test("v in cursor mode enters select mode", async () => {
    testSetup = await setup()
    await press(testSetup, "v") // cursor -> select
    expect(testSetup.captureCharFrame()).toContain("mode:select")
  })

  test("j in select mode extends selection", async () => {
    testSetup = await setup()
    await press(testSetup, "j") // cursor at 1
    await press(testSetup, "v") // select, anchor at 1
    await press(testSetup, "j") // cursor at 2
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("mode:select")
    expect(frame).toContain("selection:1-2")
  })

  test("k in select mode extends selection upward", async () => {
    testSetup = await setup()
    await press(testSetup, "j") // cursor at 1
    await press(testSetup, "j") // cursor at 2
    await press(testSetup, "j") // cursor at 3
    await press(testSetup, "v") // select, anchor at 3
    await press(testSetup, "k") // cursor at 2
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("selection:2-3")
  })

  test("Escape in select mode returns to cursor mode", async () => {
    testSetup = await setup()
    await press(testSetup, "v") // select
    expect(testSetup.captureCharFrame()).toContain("mode:select")
    await pressEscape(testSetup)
    expect(testSetup.captureCharFrame()).toContain("mode:cursor")
  })

  test("selection is correctly ordered when cursor moves above anchor", async () => {
    testSetup = await setup()
    await press(testSetup, "j")
    await press(testSetup, "j")
    await press(testSetup, "j")
    await press(testSetup, "v") // select, anchor at 3
    await press(testSetup, "k") // cursor at 2
    await press(testSetup, "k") // cursor at 1
    const frame = testSetup.captureCharFrame()
    // anchor=3, cursor=1, so start=1, end=3
    expect(frame).toContain("selection:1-3")
  })
})
