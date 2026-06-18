import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { resolve } from "path"
import { MouseButtons } from "@opentui/core/testing"
import { TooeeProvider } from "@tooee/shell"
import type { ActionDefinition } from "@tooee/commands"
import { View } from "../src/View.js"
import { createTableFileProvider } from "../src/default-provider.js"

const CSV = resolve(import.meta.dir, "fixtures/data.csv")

const ACTIONS: ActionDefinition[] = [
  { id: "row.copy", title: "Copy row", hotkey: "y", modes: ["cursor"], handler: () => {} },
  { id: "row.open", title: "Open row", modes: ["cursor"], handler: () => {} },
]

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

async function setup() {
  const s = await testRender(
    <TooeeProvider>
      <View contentProvider={createTableFileProvider(CSV)} actions={ACTIONS} />
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

describe("Table view mouse integration", () => {
  test("right-click on a row opens the context menu with row actions", async () => {
    testSetup = await setup()
    // Menu actions are not on screen before the right-click.
    expect(testSetup.captureCharFrame()).not.toContain("Copy row")

    const pos = lineOf(testSetup.captureCharFrame(), "Bob")
    expect(pos.y).toBeGreaterThan(-1)

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.RIGHT)
    })
    await testSetup.renderOnce()

    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("Copy row")
    expect(frame).toContain("Open row")
  })

  test("Escape dismisses the context menu", async () => {
    testSetup = await setup()
    const pos = lineOf(testSetup.captureCharFrame(), "Alice")

    await act(async () => {
      await testSetup.mockMouse.click(pos.x + 1, pos.y, MouseButtons.RIGHT)
    })
    await testSetup.renderOnce()
    expect(testSetup.captureCharFrame()).toContain("Copy row")

    await act(async () => {
      testSetup.mockInput.pressEscape()
    })
    await testSetup.renderOnce()
    expect(testSetup.captureCharFrame()).not.toContain("Copy row")
  })
})
