import { afterEach, describe, expect, test } from "bun:test"
import { act } from "react"
import { TooeeProvider } from "@tooee/shell"
import { testRender } from "../../../test/support/test-render.ts"
import { AskOverlay } from "../src/AskOverlay.js"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

async function setup(opts: { onCancel?: () => void } = {}) {
  const s = await testRender(
    <TooeeProvider initialMode="insert">
      <AskOverlay prompt="Question" onSubmit={() => {}} onCancel={opts.onCancel ?? (() => {})} />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  )
  await s.renderOnce()
  return s
}

async function pressEscape() {
  await act(async () => {
    testSetup.mockInput.pressEscape()
  })
  await testSetup.renderOnce()
}

async function press(key: string) {
  await act(async () => {
    testSetup.mockInput.pressKey(key)
  })
  await testSetup.renderOnce()
}

describe("AskOverlay escape handling", () => {
  test("escape enters cursor mode without cancelling, then remains safe", async () => {
    let cancelCount = 0
    testSetup = await setup({
      onCancel: () => {
        cancelCount++
      },
    })

    await pressEscape()

    expect(cancelCount).toBe(0)
    expect(testSetup.captureCharFrame()).toContain("i insert  q quit  Enter submit")

    await pressEscape()

    expect(cancelCount).toBe(0)
    expect(testSetup.captureCharFrame()).toContain("i insert  q quit  Enter submit")
  })

  test("q cancels in cursor mode", async () => {
    let cancelCount = 0
    testSetup = await setup({
      onCancel: () => {
        cancelCount++
      },
    })

    await pressEscape()
    await press("q")

    expect(cancelCount).toBe(1)
  })
})
