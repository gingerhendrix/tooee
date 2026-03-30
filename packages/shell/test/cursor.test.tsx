import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { TooeeProvider, useNavigation } from "@tooee/shell"
import { useMode } from "@tooee/commands"
import { press, pressTab, pressEscape, type TestSession } from "./support/test-helpers.ts"

function CursorHarness({ rowCount }: { rowCount: number }) {
  const nav = useNavigation({ rowCount, viewportHeight: 10, multiSelect: true })
  const mode = useMode()
  const selection = nav.selection

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`cursor:${nav.cursor !== null ? nav.cursor : "null"}`} />
      <text content={`selection:${selection ? `${selection.start}-${selection.end}` : "null"}`} />
      <text content={`toggled:${Array.from(nav.toggledIndices).sort((a, b) => a - b).join(",")}`} />
    </box>
  )
}

async function setup(rowCount = 100) {
  const session = await testRender(
    <TooeeProvider>
      <CursorHarness rowCount={rowCount} />
    </TooeeProvider>,
    { width: 60, height: 24, kittyKeyboard: true },
  )
  await session.renderOnce()
  return session
}

let testSetup: TestSession

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
    await press(testSetup, "j")
    expect(testSetup.captureCharFrame()).toContain("cursor:1")
  })

  test("k in cursor mode moves cursor up", async () => {
    testSetup = await setup()
    await press(testSetup, "j")
    await press(testSetup, "j")
    await press(testSetup, "k")
    expect(testSetup.captureCharFrame()).toContain("cursor:1")
  })

  test("tab toggles current row", async () => {
    testSetup = await setup()
    await press(testSetup, "j")
    await pressTab(testSetup)
    expect(testSetup.captureCharFrame()).toContain("toggled:1")
  })

  test("shift+tab toggles current row and moves up", async () => {
    testSetup = await setup()
    await press(testSetup, "j")
    await press(testSetup, "j")
    await pressTab(testSetup, { shift: true })
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("toggled:2")
    expect(frame).toContain("cursor:1")
  })

  test("Escape in cursor mode leaves mode unchanged", async () => {
    testSetup = await setup()
    await pressEscape(testSetup)
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("mode:cursor")
    expect(frame).toContain("cursor:0")
  })
})

describe("select mode", () => {
  test("v in cursor mode enters select mode", async () => {
    testSetup = await setup()
    await press(testSetup, "v")
    expect(testSetup.captureCharFrame()).toContain("mode:select")
  })

  test("j in select mode extends selection", async () => {
    testSetup = await setup()
    await press(testSetup, "j")
    await press(testSetup, "v")
    await press(testSetup, "j")
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("mode:select")
    expect(frame).toContain("selection:1-2")
  })

  test("k in select mode extends selection upward", async () => {
    testSetup = await setup()
    await press(testSetup, "j")
    await press(testSetup, "j")
    await press(testSetup, "j")
    await press(testSetup, "v")
    await press(testSetup, "k")
    expect(testSetup.captureCharFrame()).toContain("selection:2-3")
  })

  test("tab in select mode toggles current row", async () => {
    testSetup = await setup()
    await press(testSetup, "j")
    await press(testSetup, "v")
    await pressTab(testSetup)
    expect(testSetup.captureCharFrame()).toContain("toggled:1")
  })

  test("Escape in select mode returns to cursor mode", async () => {
    testSetup = await setup()
    await press(testSetup, "v")
    await pressEscape(testSetup)
    expect(testSetup.captureCharFrame()).toContain("mode:cursor")
  })

  test("selection is correctly ordered when cursor moves above anchor", async () => {
    testSetup = await setup()
    await press(testSetup, "j")
    await press(testSetup, "j")
    await press(testSetup, "j")
    await press(testSetup, "v")
    await press(testSetup, "k")
    await press(testSetup, "k")
    expect(testSetup.captureCharFrame()).toContain("selection:1-3")
  })
})
