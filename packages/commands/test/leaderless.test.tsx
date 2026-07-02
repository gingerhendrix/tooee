import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act, useState } from "react"
import { CommandProvider, useCommand } from "../src/index.js"

type TestSession = Awaited<ReturnType<typeof testRender>>

let testSetup: TestSession

afterEach(() => {
  testSetup?.renderer.destroy()
})

async function press(session: TestSession, key: string, modifiers?: { ctrl?: boolean }) {
  await act(async () => {
    session.mockInput.pressKey(key, modifiers)
  })
  await session.renderOnce()
}

describe("leaderless <leader> hotkeys (R-06)", () => {
  test("a <leader> hotkey with no configured leader never fires", async () => {
    function Harness() {
      const [count, setCount] = useState(0)
      useCommand({
        id: "leader.cmd",
        title: "Leader command",
        hotkey: "<leader>n",
        handler: () => setCount((n) => n + 1),
      })
      return <text content={`count:${count}`} />
    }

    testSetup = await testRender(
      // No leader configured on the provider
      <CommandProvider>
        <Harness />
      </CommandProvider>,
      { width: 60, height: 10, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    // Must not have sprung to life on the old invented ctrl+x default...
    await press(testSetup, "x", { ctrl: true })
    await press(testSetup, "n")
    // ...and an unmatchable (zero-step) hotkey must not match arbitrary keys.
    await press(testSetup, "a")
    expect(testSetup.captureCharFrame()).toContain("count:0")
  })

  test("a <leader> hotkey with a configured leader still works", async () => {
    function Harness() {
      const [count, setCount] = useState(0)
      useCommand({
        id: "leader.cmd",
        title: "Leader command",
        hotkey: "<leader>n",
        handler: () => setCount((n) => n + 1),
      })
      return <text content={`count:${count}`} />
    }

    testSetup = await testRender(
      <CommandProvider leader="space">
        <Harness />
      </CommandProvider>,
      { width: 60, height: 10, kittyKeyboard: true },
    )
    await testSetup.renderOnce()

    await press(testSetup, " ")
    await press(testSetup, "n")
    expect(testSetup.captureCharFrame()).toContain("count:1")
  })
})
