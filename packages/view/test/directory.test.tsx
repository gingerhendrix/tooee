import { testRender } from "@opentui/react/test-utils"
import { test, expect, afterEach, describe } from "bun:test"
import { act } from "react"
import { resolve } from "path"
import { TooeeProvider } from "@tooee/shell"
import { DirectoryView } from "../src/DirectoryView.tsx"
import { listDirectoryFiles } from "../src/directory-provider.ts"

const TEST_DIR = resolve(import.meta.dir, "fixtures/test-dir")

// --- Unit tests for listDirectoryFiles ---

describe("listDirectoryFiles", () => {
  test("lists files sorted alphabetically", () => {
    const files = listDirectoryFiles(TEST_DIR)
    expect(files.map((f) => f.name)).toEqual(["alpha.md", "beta.ts", "gamma.txt"])
  })

  test("returns correct paths", () => {
    const files = listDirectoryFiles(TEST_DIR)
    for (const f of files) {
      expect(f.path).toBe(resolve(TEST_DIR, f.name))
    }
  })
})

// --- Component tests for DirectoryView ---

let testSetup: Awaited<ReturnType<typeof testRender>>

afterEach(() => {
  testSetup?.renderer.destroy()
})

async function setup() {
  const s = await testRender(
    <TooeeProvider>
      <DirectoryView dirPath={TEST_DIR} />
    </TooeeProvider>,
    { width: 80, height: 24, kittyKeyboard: true },
  )
  await s.renderOnce()
  // Allow async content load
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100))
  })
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
  // Allow async content load after file switch
  await act(async () => {
    await new Promise((r) => setTimeout(r, 100))
  })
  await s.renderOnce()
}

test("shows first file on load", async () => {
  testSetup = await setup()
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("alpha.md")
  expect(frame).toContain("1/3")
})

test("l switches to next file", async () => {
  testSetup = await setup()
  await press(testSetup, "l")
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("beta.ts")
  expect(frame).toContain("2/3")
})

test("h switches to previous file", async () => {
  testSetup = await setup()
  await press(testSetup, "l")
  await press(testSetup, "h")
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("alpha.md")
  expect(frame).toContain("1/3")
})

test("l at last file stays on last file", async () => {
  testSetup = await setup()
  await press(testSetup, "l")
  await press(testSetup, "l")
  await press(testSetup, "l") // past end
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("gamma.txt")
  expect(frame).toContain("3/3")
})

test("h at first file stays on first file", async () => {
  testSetup = await setup()
  await press(testSetup, "h")
  const frame = testSetup.captureCharFrame()
  expect(frame).toContain("alpha.md")
  expect(frame).toContain("1/3")
})

test("file position indicator updates through navigation", async () => {
  testSetup = await setup()
  expect(testSetup.captureCharFrame()).toContain("1/3")
  await press(testSetup, "l")
  expect(testSetup.captureCharFrame()).toContain("2/3")
  await press(testSetup, "l")
  expect(testSetup.captureCharFrame()).toContain("3/3")
})
