import { afterEach, describe, expect, test } from "bun:test"
import { act } from "react"
import { TooeeProvider } from "@tooee/shell"
import { testRender } from "../../../test/support/test-render.ts"
import { Ask } from "../src/Ask.js"
import { AskOverlay } from "../src/AskOverlay.js"

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

async function setupAsk(
  opts: {
    multiline?: boolean
    defaultValue?: string
    onSubmit?: (value: string) => void
  } = {},
) {
  const s = await testRender(
    <TooeeProvider initialMode="insert">
      <Ask
        prompt="Question"
        multiline={opts.multiline}
        defaultValue={opts.defaultValue}
        actions={[
          {
            id: "submit",
            title: "Submit",
            handler: (ctx) => opts.onSubmit?.(ctx.ask.value),
          },
        ]}
      />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  )
  await s.renderOnce()
  return s
}

async function setup(
  opts: {
    multiline?: boolean
    defaultValue?: string
    onSubmit?: (value: string) => void
    onCancel?: () => void
  } = {},
) {
  const s = await testRender(
    <TooeeProvider initialMode="insert">
      <AskOverlay
        prompt="Question"
        multiline={opts.multiline}
        defaultValue={opts.defaultValue}
        onSubmit={opts.onSubmit ?? (() => {})}
        onCancel={opts.onCancel ?? (() => {})}
      />
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

async function press(key: string, modifiers?: { ctrl?: boolean; shift?: boolean }) {
  await act(async () => {
    testSetup.mockInput.pressKey(key, modifiers)
  })
  await testSetup.renderOnce()
}

async function pressEnter() {
  await act(async () => {
    testSetup.mockInput.pressEnter()
  })
  await testSetup.renderOnce()
}

function findEditableWithText(node: unknown, text: string): { cursorOffset: number } | undefined {
  if (!node || typeof node !== "object") return undefined

  if (
    "plainText" in node &&
    "cursorOffset" in node &&
    (node as { plainText: string }).plainText === text
  ) {
    return node as { cursorOffset: number }
  }

  if ("getChildren" in node && typeof node.getChildren === "function") {
    for (const child of node.getChildren()) {
      const match = findEditableWithText(child, text)
      if (match) return match
    }
  }

  return undefined
}

describe("Ask default value cursor", () => {
  test("single-line typing appends after the default value", async () => {
    let submitted = ""
    testSetup = await setupAsk({
      defaultValue: "hello",
      onSubmit: (value) => {
        submitted = value
      },
    })

    await press("!")
    await pressEnter()

    expect(submitted).toBe("hello!")
  })

  test("multiline cursor starts at the end of the default value", async () => {
    const defaultValue = "hello\nworld"
    testSetup = await setupAsk({
      multiline: true,
      defaultValue,
    })

    const textarea = findEditableWithText(testSetup.renderer.root, defaultValue)

    expect(textarea?.cursorOffset).toBe(defaultValue.length)
  })
})

describe("AskOverlay default value cursor", () => {
  test("single-line typing appends after the default value", async () => {
    let submitted = ""
    testSetup = await setup({
      defaultValue: "hello",
      onSubmit: (value) => {
        submitted = value
      },
    })

    await press("!")
    await pressEnter()

    expect(submitted).toBe("hello!")
  })

  test("multiline cursor starts at the end of the default value", async () => {
    const defaultValue = "hello\nworld"
    testSetup = await setup({
      multiline: true,
      defaultValue,
    })

    const textarea = findEditableWithText(testSetup.renderer.root, defaultValue)

    expect(textarea?.cursorOffset).toBe(defaultValue.length)
  })
})

describe("Ask cursor-mode motions", () => {
  test("h and l move the standalone single-line cursor before returning to insert mode", async () => {
    let submitted = ""
    testSetup = await setupAsk({
      defaultValue: "abcd",
      onSubmit: (value) => {
        submitted = value
      },
    })

    await pressEscape()
    await press("h")
    await press("h")
    await press("l")
    await press("i")
    await press("X")
    await pressEnter()

    expect(submitted).toBe("abcXd")
  })

  test("h and l move the overlay single-line cursor before returning to insert mode", async () => {
    let submitted = ""
    testSetup = await setup({
      defaultValue: "abcd",
      onSubmit: (value) => {
        submitted = value
      },
    })

    await pressEscape()
    await press("h")
    await press("h")
    await press("l")
    await press("i")
    await press("X")
    await pressEnter()

    expect(submitted).toBe("abcXd")
  })

  test("b supports standalone word-back motion", async () => {
    let submitted = ""
    testSetup = await setupAsk({
      defaultValue: "one two",
      onSubmit: (value) => {
        submitted = value
      },
    })

    await pressEscape()
    await press("b")
    await press("i")
    await press("X")
    await pressEnter()

    expect(submitted).toBe("one Xtwo")
  })

  test("gg and G support overlay buffer motions", async () => {
    const defaultValue = "ab\ncd"
    testSetup = await setup({
      multiline: true,
      defaultValue,
    })

    await pressEscape()
    await press("g")
    await press("g")

    const textareaAfterGg = findEditableWithText(testSetup.renderer.root, defaultValue)
    expect(textareaAfterGg?.cursorOffset).toBe(0)

    await press("g", { shift: true })

    const textareaAfterG = findEditableWithText(testSetup.renderer.root, defaultValue)
    expect(textareaAfterG?.cursorOffset).toBe(defaultValue.length)
  })

  test("j and k move the standalone multiline cursor", async () => {
    const defaultValue = "ab\ncd"
    testSetup = await setupAsk({
      multiline: true,
      defaultValue,
    })

    await pressEscape()
    await press("k")

    const textareaAfterUp = findEditableWithText(testSetup.renderer.root, defaultValue)
    expect(textareaAfterUp?.cursorOffset).toBe(2)

    await press("j")

    const textareaAfterDown = findEditableWithText(testSetup.renderer.root, defaultValue)
    expect(textareaAfterDown?.cursorOffset).toBe(defaultValue.length)
  })

  test("j and k move the overlay multiline cursor", async () => {
    const defaultValue = "ab\ncd"
    testSetup = await setup({
      multiline: true,
      defaultValue,
    })

    await pressEscape()
    await press("k")

    const textareaAfterUp = findEditableWithText(testSetup.renderer.root, defaultValue)
    expect(textareaAfterUp?.cursorOffset).toBe(2)

    await press("j")

    const textareaAfterDown = findEditableWithText(testSetup.renderer.root, defaultValue)
    expect(textareaAfterDown?.cursorOffset).toBe(defaultValue.length)
  })
})

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
