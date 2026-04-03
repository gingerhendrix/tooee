import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { TooeeProvider, useNavigation } from "@tooee/shell"
import { useSearch } from "@tooee/search"
import { useMode } from "@tooee/commands"
import { press, type TestSession } from "./support/test-helpers.ts"

function ModalHarness({
  rowCount,
  isSelectable,
}: {
  rowCount: number
  isSelectable?: (index: number) => boolean
}) {
  const nav = useNavigation({ rowCount, isSelectable, viewportHeight: 10 })
  const mode = useMode()
  const search = useSearch({
    match: () => [],
    onJump: nav.setCursor,
  })

  return (
    <box flexDirection="column">
      <text content={`mode:${mode}`} />
      <text content={`cursor:${nav.cursor !== null ? nav.cursor : "null"}`} />
      <text content={`search:${search.searchActive}`} />
    </box>
  )
}

async function setup(rowCount = 100, isSelectable?: (index: number) => boolean) {
  const session = await testRender(
    <TooeeProvider>
      <ModalHarness rowCount={rowCount} isSelectable={isSelectable} />
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

test("starts in cursor mode with cursor at 0", async () => {
  testSetup = await setup()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("mode:cursor")
  expect(frame).toContain("cursor:0")
})

test("j moves cursor down", async () => {
  testSetup = await setup()
  await press(testSetup, "j")
  expect(testSetup.captureCharFrame()).toContain("cursor:1")
})

test("k moves cursor up", async () => {
  testSetup = await setup()
  await press(testSetup, "j")
  await press(testSetup, "j")
  await press(testSetup, "k")
  expect(testSetup.captureCharFrame()).toContain("cursor:1")
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

  expect(testSetup.captureCharFrame()).toContain("cursor:0")
})

test("shift+g moves cursor to bottom", async () => {
  testSetup = await setup()
  await press(testSetup, "g", { shift: true })
  expect(testSetup.captureCharFrame()).toContain("cursor:99")
})

test("ctrl+d moves cursor half page down", async () => {
  testSetup = await setup()
  await press(testSetup, "d", { ctrl: true })
  expect(testSetup.captureCharFrame()).toContain("cursor:5")
})

test("ctrl+u moves cursor half page up", async () => {
  testSetup = await setup()
  await press(testSetup, "d", { ctrl: true })
  await press(testSetup, "d", { ctrl: true })
  expect(testSetup.captureCharFrame()).toContain("cursor:10")
  await press(testSetup, "u", { ctrl: true })
  expect(testSetup.captureCharFrame()).toContain("cursor:5")
})

test("/ activates search", async () => {
  testSetup = await setup()
  await press(testSetup, "/")
  expect(testSetup.captureCharFrame()).toContain("search:true")
})

describe("selectable rows", () => {
  test("movement skips non-selectable rows", async () => {
    testSetup = await setup(6, (index) => index % 2 === 0)
    expect(testSetup.captureCharFrame()).toContain("cursor:0")

    await press(testSetup, "j")
    expect(testSetup.captureCharFrame()).toContain("cursor:2")

    await press(testSetup, "j")
    expect(testSetup.captureCharFrame()).toContain("cursor:4")

    await press(testSetup, "k")
    expect(testSetup.captureCharFrame()).toContain("cursor:2")
  })

  test("top and bottom jumps land on selectable rows", async () => {
    testSetup = await setup(6, (index) => index !== 0 && index !== 5)
    expect(testSetup.captureCharFrame()).toContain("cursor:1")

    await press(testSetup, "g", { shift: true })
    expect(testSetup.captureCharFrame()).toContain("cursor:4")

    await act(async () => {
      testSetup.mockInput.pressKey("g")
    })
    await act(async () => {
      testSetup.mockInput.pressKey("g")
    })
    await testSetup.renderOnce()

    expect(testSetup.captureCharFrame()).toContain("cursor:1")
  })
})
