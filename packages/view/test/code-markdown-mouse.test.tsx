import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { MouseButtons } from "@opentui/core/testing"
import { TooeeProvider } from "@tooee/shell"
import type { ActionDefinition } from "@tooee/commands"
import { View } from "../src/View.js"
import type { AnyContent, ContentProvider } from "../src/types.js"

function staticProvider(content: AnyContent): ContentProvider {
  return { format: content.format, load: () => content }
}

const CODE = staticProvider({
  format: "code",
  code: ["line0", "line1", "line2", "line3", "line4"].join("\n"),
  language: "text",
})

const MD = staticProvider({
  format: "markdown",
  markdown: "First.\n\nSecond.\n\nThird.",
})

const ACTIONS: ActionDefinition[] = [
  { id: "row.copy", title: "Copy row", hotkey: "y", modes: ["cursor"], handler: () => {} },
  { id: "row.open", title: "Open row", modes: ["cursor"], handler: () => {} },
]

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

async function setup(provider: ContentProvider, actions?: ActionDefinition[]) {
  const s = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} actions={actions} />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  )
  await s.renderOnce()
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100))
  })
  await s.renderOnce()
  return s
}

function lineOf(frame: string, text: string): { x: number; y: number } {
  const lines = frame.split("\n")
  for (let y = 0; y < lines.length; y++) {
    const x = lines[y].indexOf(text)
    if (x >= 0) return { x, y }
  }
  return { x: -1, y: -1 }
}

describe("Code view mouse selection", () => {
  test("left-click on a source line selects that line", async () => {
    testSetup = await setup(CODE)
    const frame0 = testSetup.captureCharFrame()
    expect(frame0).toMatch(/Cursor:\s*0/)

    const pos = lineOf(frame0, "line3")
    expect(pos.y).toBeGreaterThan(-1)

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.LEFT)
    })
    await testSetup.renderOnce()

    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*3/)
  })

  test("left-click stands down while a modal overlay is open", async () => {
    testSetup = await setup(CODE)
    const frame0 = testSetup.captureCharFrame()
    const pos = lineOf(frame0, "line3")

    await act(async () => {
      testSetup.mockInput.pressKey("t")
    })
    await testSetup.renderOnce()
    expect(testSetup.captureCharFrame()).toContain("Filter themes")

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.LEFT)
    })
    await testSetup.renderOnce()

    await act(async () => {
      testSetup.mockInput.pressEscape()
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).not.toContain("Filter themes")
    expect(frame).toMatch(/Cursor:\s*0/)
  })

  test("right-click selects a source line and opens the context menu", async () => {
    testSetup = await setup(CODE, ACTIONS)
    const pos = lineOf(testSetup.captureCharFrame(), "line3")
    expect(pos.y).toBeGreaterThan(-1)

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.RIGHT)
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Copy row")
    expect(frame).toContain("Open row")
    expect(frame).toMatch(/Cursor:\s*3/)
  })

  test("right-click stands down while a modal overlay is open", async () => {
    testSetup = await setup(CODE, ACTIONS)
    const pos = lineOf(testSetup.captureCharFrame(), "line3")

    await act(async () => {
      testSetup.mockInput.pressKey("t")
    })
    await testSetup.renderOnce()
    expect(testSetup.captureCharFrame()).toContain("Filter themes")

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.RIGHT)
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Filter themes")
    expect(frame).not.toContain("Copy row")
  })
})

describe("Markdown view mouse selection", () => {
  test("left-click on a block selects that block", async () => {
    testSetup = await setup(MD)
    const frame0 = testSetup.captureCharFrame()
    expect(frame0).toMatch(/Cursor:\s*0/)

    const pos = lineOf(frame0, "Third.")
    expect(pos.y).toBeGreaterThan(-1)

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.LEFT)
    })
    await testSetup.renderOnce()

    // Blocks: 0 = "First.", 1 = "Second.", 2 = "Third."
    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*2/)
  })

  test("right-click selects a block and opens the context menu", async () => {
    testSetup = await setup(MD, ACTIONS)
    const pos = lineOf(testSetup.captureCharFrame(), "Second.")
    expect(pos.y).toBeGreaterThan(-1)

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.RIGHT)
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Copy row")
    expect(frame).toContain("Open row")
    expect(frame).toMatch(/Cursor:\s*1/)
  })
})
