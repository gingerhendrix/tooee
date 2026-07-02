import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { MouseButtons } from "@opentui/core/testing"
import { TooeeProvider } from "@tooee/shell"
import { View } from "../src/View.js"
import type { AnyContent, ContentProvider, ContentRenderer } from "../src/types.js"

// A custom format whose text has 4 rows, so nav.setCursor(2) is a valid row.
const CONTENT: AnyContent = {
  format: "chart",
  data: {},
  getTextContent: () => "a\nb\nc\nd",
}

const PROVIDER: ContentProvider = { format: "chart", load: () => CONTENT }

// A custom renderer that wires left-click to the host-provided onSelectRow.
const RENDERER: ContentRenderer = ({ onSelectRow }) => (
  <box onMouseDown={() => onSelectRow?.(2)}>
    <text content="CUSTOM-BODY" />
  </box>
)

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

function lineOf(frame: string, text: string): { x: number; y: number } {
  const lines = frame.split("\n")
  for (let y = 0; y < lines.length; y++) {
    const x = lines[y].indexOf(text)
    if (x >= 0) return { x, y }
  }
  return { x: -1, y: -1 }
}

describe("Custom renderer mouse selection", () => {
  test("a custom renderer can select a row via onSelectRow", async () => {
    testSetup = await testRender(
      <TooeeProvider>
        <View contentProvider={PROVIDER} renderers={{ chart: RENDERER }} />
      </TooeeProvider>,
      { width: 80, height: 24, kittyKeyboard: true },
    )
    await testSetup.renderOnce()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    await testSetup.renderOnce()

    const frame0 = testSetup.captureCharFrame()
    expect(frame0).toMatch(/Cursor:\s*0/)
    const pos = lineOf(frame0, "CUSTOM-BODY")
    expect(pos.y).toBeGreaterThan(-1)

    await act(async () => {
      await testSetup.mockMouse.click(pos.x, pos.y, MouseButtons.LEFT)
    })
    await testSetup.renderOnce()

    expect(testSetup.captureCharFrame()).toMatch(/Cursor:\s*2/)
  })
})
