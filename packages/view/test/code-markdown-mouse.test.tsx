import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { MouseButtons } from "@opentui/core/testing"
import { TooeeProvider } from "@tooee/shell"
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

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

async function setup(provider: ContentProvider) {
  const s = await testRender(
    <TooeeProvider>
      <View contentProvider={provider} />
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
})
