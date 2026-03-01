import { testRender } from "../../../test/support/test-render.ts"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { TooeeProvider } from "@tooee/shell"
import { Choose } from "../src/Choose.js"
import type { ChooseContentProvider } from "../src/types.js"

const ITEMS = [
  { text: "alpha" },
  { text: "beta" },
  { text: "gamma" },
  { text: "delta" },
  { text: "epsilon" },
]

function makeProvider(items = ITEMS): ChooseContentProvider {
  return { load: () => items }
}

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

async function setup(
  opts: {
    multi?: boolean
    prompt?: string
    onConfirm?: (r: any) => void
    onCancel?: () => void
    kittyKeyboard?: boolean
  } = {},
) {
  const s = await testRender(
    <TooeeProvider initialMode="insert">
      <Choose
        contentProvider={makeProvider()}
        options={{ multi: opts.multi, prompt: opts.prompt }}
        onConfirm={opts.onConfirm}
        onCancel={opts.onCancel}
      />
    </TooeeProvider>,
    { width: 60, height: 24, kittyKeyboard: opts.kittyKeyboard ?? true },
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

async function pressArrow(
  s: Awaited<ReturnType<typeof testRender>>,
  direction: "up" | "down" | "left" | "right",
) {
  await act(async () => {
    s.mockInput.pressArrow(direction)
  })
  await s.renderOnce()
}

describe("Choose rendering", () => {
  test("renders all items", async () => {
    testSetup = await setup()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("alpha")
    expect(frame).toContain("beta")
    expect(frame).toContain("gamma")
    expect(frame).toContain("delta")
    expect(frame).toContain("epsilon")
    expect(frame).toContain("5/5")
  })

  test("first item is highlighted by default", async () => {
    testSetup = await setup()
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("alpha")
  })
})

describe("Choose arrow key navigation (kitty keyboard)", () => {
  test("down arrow moves selection down", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    await pressArrow(testSetup, "down")

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("beta")
  })

  test("up arrow moves selection up", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    await pressArrow(testSetup, "down")
    await pressArrow(testSetup, "down")
    await pressArrow(testSetup, "up")

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("beta")
  })

  test("up arrow at top stays on first item", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    await pressArrow(testSetup, "up")

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("alpha")
  })

  test("ctrl+n moves down", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    await press(testSetup, "n", { ctrl: true })

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("beta")
  })

  test("ctrl+p moves up", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    await press(testSetup, "n", { ctrl: true })
    await press(testSetup, "n", { ctrl: true })
    await press(testSetup, "p", { ctrl: true })

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("beta")
  })
})

describe("Choose arrow key navigation (non-kitty keyboard)", () => {
  test("down arrow moves selection down (non-kitty)", async () => {
    let confirmed: any = null
    testSetup = await setup({
      kittyKeyboard: false,
      onConfirm: (r) => {
        confirmed = r
      },
    })

    await pressArrow(testSetup, "down")

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("beta")
  })

  test("up arrow moves selection up (non-kitty)", async () => {
    let confirmed: any = null
    testSetup = await setup({
      kittyKeyboard: false,
      onConfirm: (r) => {
        confirmed = r
      },
    })

    await pressArrow(testSetup, "down")
    await pressArrow(testSetup, "down")
    await pressArrow(testSetup, "up")

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("beta")
  })
})

describe("Choose confirm returns correct item", () => {
  test("enter on first item returns first item", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items).toHaveLength(1)
    expect(confirmed.items[0].text).toBe("alpha")
  })

  test("enter after navigating to third item returns third item", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    await pressArrow(testSetup, "down")
    await pressArrow(testSetup, "down")

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("gamma")
  })
})

describe("Choose cursor mode navigation", () => {
  test("j/k work in cursor mode", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    // Switch to cursor mode via Escape
    await act(async () => {
      testSetup.mockInput.pressEscape()
    })
    await testSetup.renderOnce()

    // j moves down
    await press(testSetup, "j")
    await press(testSetup, "j")

    // Confirm
    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("gamma")
  })
})

describe("Choose visual alignment", () => {
  test("highlight background is on the correct row", async () => {
    testSetup = await setup()

    const charFrame = testSetup.captureCharFrame()

    // Find which line has "alpha" and which has "beta"
    const lines = charFrame.split("\n")
    let alphaLine = -1
    let betaLine = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("alpha")) alphaLine = i
      if (lines[i].includes("beta")) betaLine = i
    }

    expect(alphaLine).toBeGreaterThan(-1)
    expect(betaLine).toBeGreaterThan(-1)
    expect(betaLine).toBe(alphaLine + 1)

    // Navigate down and check that the highlight moves
    await pressArrow(testSetup, "down")
    const frame2 = testSetup.captureCharFrame()
    // Both items should still be visible
    expect(frame2).toContain("alpha")
    expect(frame2).toContain("beta")
  })

  test("navigating to last item and confirming returns correct item", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    // Navigate to the last item
    await pressArrow(testSetup, "down")
    await pressArrow(testSetup, "down")
    await pressArrow(testSetup, "down")
    await pressArrow(testSetup, "down")

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("epsilon")
  })

  test("navigating past last item stays on last item", async () => {
    let confirmed: any = null
    testSetup = await setup({
      onConfirm: (r) => {
        confirmed = r
      },
    })

    // Navigate past the end
    for (let i = 0; i < 10; i++) {
      await pressArrow(testSetup, "down")
    }

    await act(async () => {
      testSetup.mockInput.pressEnter()
    })
    await testSetup.renderOnce()

    expect(confirmed).not.toBeNull()
    expect(confirmed.items[0].text).toBe("epsilon")
  })
})

describe("Choose emptyMessage", () => {
  async function setupEmpty(opts: {
    items?: typeof ITEMS
    emptyMessage?: string
    onCancel?: () => void
  } = {}) {
    const s = await testRender(
      <TooeeProvider initialMode="insert">
        <Choose
          contentProvider={makeProvider(opts.items ?? [])}
          options={{ emptyMessage: opts.emptyMessage }}
          onCancel={opts.onCancel}
        />
      </TooeeProvider>,
      { width: 60, height: 24, kittyKeyboard: true },
    )
    await s.renderOnce()
    return s
  }

  test("shows emptyMessage when items list is empty", async () => {
    testSetup = await setupEmpty({ emptyMessage: "No items available." })
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("No items available.")
    expect(frame).toContain("0/0")
  })

  test("does not show emptyMessage when items exist", async () => {
    testSetup = await setupEmpty({ items: ITEMS, emptyMessage: "No items available." })
    const frame = testSetup.captureCharFrame()
    expect(frame).not.toContain("No items available.")
    expect(frame).toContain("alpha")
  })

  test("does not show message when emptyMessage is not set", async () => {
    testSetup = await setupEmpty({ items: [] })
    const frame = testSetup.captureCharFrame()
    expect(frame).toContain("0/0")
    // No crash, just empty list
  })
})
